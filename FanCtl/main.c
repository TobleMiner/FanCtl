/*
 * FanCtl.c
 *
 * Created: 27.05.2016 18:23:34
 * Author : Tobias
 */ 

/* IO:
 *	Fan 0:
 *		PWM: OC0A (PD6)
 *		Speed: PCINT6 (PB6)
 *	Fan 1:
 *		PWM: OC0B (PD5)
 *		Speed: PCINT7 (PB7)
 *	Fan 2:
 *		PWM: OC2A (PB3)
 *		Speed: PCINT18 (PD2)
 *	Fan 3:
 *		PWM: OC2B (PD3)
 *		Speed: PCINT20 (PD4)
 *	I2C
 */

#define F_CPU 8000000UL

#include <avr/io.h>
#include <stdlib.h>
#include <stdio.h>
#include <avr/interrupt.h>
#include <avr/sleep.h>
#include "lib/uart.h"

typedef struct
{
	uint8_t* pwm_reg;
	uint16_t rpm;
	uint8_t fault;
	uint16_t pulsecount;
	uint8_t sense;
} fan_t;

typedef struct
{
	uint8_t address;
	uint8_t length;
	uint8_t* target;
} i2c_reg_t;

i2c_reg_t** i2c_regs;
uint8_t i2c_num_regs;

#define I2C_STATUS_START_W 0x60
#define I2C_STATUS_START_R 0xA8
#define I2C_STATUS_BYTE_R 0x80
#define I2C_STATUS_BYTE_W 0xB8
#define I2C_STATUS_NAK_W 0xC0
#define I2C_STATUS_STOP_W 0xA0
#define I2C_STATUS_STOP_R 0xC8

#define I2C_STATE_IDLE 0
#define I2C_STATE_ADDRESS 1
#define I2C_STATE_DATA 2

#define I2C_MODE_R 0
#define I2C_MODE_W 1

#define I2C_BUFF_SIZE 16

struct
{
	uint8_t mode:1;
	uint8_t state:2;
	uint8_t reg_addr;
	uint8_t num_bytes;
	uint8_t buff[I2C_BUFF_SIZE];
	uint8_t* buff_r;
	uint8_t* buff_w;
} i2c;

#define THREE_SECONDS 11719
uint16_t tm0_cnt = 0;

#define NUM_FANS 4
uint8_t num_fans = NUM_FANS;
fan_t* fans[NUM_FANS];

#define I2C_ADDRESS 42

i2c_reg_t* alloc_i2c_reg(uint8_t size, uint8_t addr, void* target)
{
	i2c_reg_t* reg = malloc(sizeof(i2c_reg_t));
	reg->address = addr;
	reg->length = size;
	reg->target = target;
	return reg;
}

int main(void)
{
	// Allocate fan structs
	i2c_num_regs = NUM_FANS * 2 + 1;
	i2c_regs = malloc(i2c_num_regs * sizeof(i2c_reg_t**));
	i2c_regs[0] = alloc_i2c_reg(1, 0, &num_fans);
	for(uint8_t i = 0; i < NUM_FANS; i++)
	{
		fans[i] = malloc(sizeof(fan_t));
		fans[i]->pulsecount = 0;
		fans[i]->fault = 0;
		fans[i]->sense = 0;
	}
	// Timer 0
	TCCR0A = (1<<COM0A0) | (1<<COM0A1) | (1<<COM0B0) | (1<<COM0B1) | (1<<WGM00) | (1<<WGM01); // Fast PWM, OC0A and OC0B inverted
	TCCR0B = (1<<CS01); // Prescaler = 8 => 3906 Hz
	TIMSK0 = (1<<TOIE0);
	fans[0]->pwm_reg = &OCR0A;
	fans[1]->pwm_reg = &OCR0B;
	// Timer 2
	TCCR2A = (1<<COM2A0) | (1<<COM2A1) | (1<<COM2B0) | (1<<COM2B1) | (1<<WGM20) | (1<<WGM21); // Fast PWM, OC0A and OC0B inverted
	TCCR2B = (1<<CS21); // Prescaler = 8 => 3906 Hz
	fans[2]->pwm_reg = &OCR2A;
	fans[3]->pwm_reg = &OCR2B;
	// Enable output drivers on timer compare match outputs
	DDRB = (1<<PINB3);
	DDRD = (1<<PIND3) | (1<<PIND5) | (1<<PIND6);
	// Set PWM levels on all outputs
	*(fans[0]->pwm_reg) = 0;
	*(fans[1]->pwm_reg) = 0;
	*(fans[2]->pwm_reg) = 0;
	*(fans[3]->pwm_reg) = 0;
	
	PORTB = (1<<PINB6) | (1<<PINB7);
	PORTD = (1<<PIND2) | (1<<PIND4);

	// Enable pin change interrupts on PCINT 6, 7, 18, 20
	PCICR = (1<<PCIE2) | (1<<PCIE0);
	PCMSK0 = (1<<PCINT6) | (1<<PCINT7);
	PCMSK2 = (1<<PCINT18) | (1<<PCINT20);
	
	// Init I2C
	TWCR = (1<<TWIE) | (1<<TWEA) | (1<<TWEN);
	TWAR = (I2C_ADDRESS<<1);
	i2c.state = I2C_STATE_IDLE;
	i2c.mode = I2C_MODE_R;
	i2c.buff_r = i2c.buff;
	i2c.buff_w = i2c.buff;
	for(uint8_t i = 0; i < NUM_FANS; i++)
	{
		i2c_regs[i * 2 + 1] =  alloc_i2c_reg(1, i * 2, fans[i]->pwm_reg);
		i2c_regs[i * 2 + 2] =  alloc_i2c_reg(2, i * 2 + 1, &fans[i]->rpm);
	}
			
	DDRB |= (1<<PINB0);
		
	// Init UART
	char str[20];
	uart_init();
	uart_init_tx();
	uart_write_async("Hello World\n");	
	sprintf(str, "Num fans  %u \n", *((uint8_t*)i2c_regs[0]->target));
	uart_write_async(str);

	sei();
    while (1)
    {
		PORTB = PORTB ^ (1<<0);
		set_sleep_mode(SLEEP_MODE_IDLE);
		sleep_enable();
		sleep_cpu();
		if(tm0_cnt == THREE_SECONDS)
		{
			for(uint8_t i = 0; i < NUM_FANS; i++)
			{
				fans[i]->rpm = fans[i]->pulsecount * (20 / 4);
				fans[i]->pulsecount = 0;
				sprintf(str, "FAN%u: %u rpm\n", i, fans[i]->rpm);
				uart_write_async(str);
			}
			tm0_cnt = 0;
		}
    }
}

void handle_counter(fan_t* fan, uint8_t* port, uint8_t bit)
{
	uint8_t state = *port>>bit & 0b1;
	if(fan->sense != state)
	{
		fan->pulsecount++;
		fan->sense = state;
	}
}

void i2c_buff_write(uint8_t* data, uint8_t len)
{
	for(uint8_t i = 0; i < len; i++)
	{
		*i2c.buff_w = data[i];
		if(++i2c.buff_w == i2c.buff + I2C_BUFF_SIZE)
			i2c.buff_w = i2c.buff;
	}
}

uint8_t i2c_buff_load_byte(uint8_t* dst)
{
	*dst = *i2c.buff_r;
	if(i2c.buff_r != i2c.buff_w)
	{
		i2c.buff_r++;
		if(i2c.buff_r == i2c.buff + I2C_BUFF_SIZE)
			i2c.buff_r = i2c.buff;
		return 0;
	}
	
	return 1;
}

void i2c_buff_flush()
{
	i2c.buff_r = i2c.buff_w;
}

void i2c_write_reg(uint8_t reg)
{
	if(reg >= i2c_num_regs)
		return;
	for(uint8_t i = 0; i < i2c_regs[reg]->length; i++)
	{
		i2c_buff_load_byte(i2c_regs[reg]->target + i);
	}
}

uint8_t i2c_buff_empty()
{
	return i2c.buff_r == i2c.buff_w;
}

uint8_t i2c_load_reg(uint8_t reg_addr)
{
	if(reg_addr >= i2c_num_regs)
		return 1;
	i2c_buff_write(((uint8_t*)i2c_regs[reg_addr]->target), i2c_regs[reg_addr]->length);
	return 0;
}

ISR(TIMER0_OVF_vect)
{
	tm0_cnt++;
}

ISR(PCINT0_vect)
{
	handle_counter(fans[0], &PINB, PINB6);
	handle_counter(fans[1], &PINB, PINB7);
}

ISR(PCINT2_vect)
{
	handle_counter(fans[2], &PIND, PIND2);
	handle_counter(fans[3], &PIND, PIND4);
}

ISR(TWI_vect)
{
	uint8_t status = TWSR & 0b11111000;
	switch(i2c.mode)
	{
		case I2C_MODE_R:
			switch(status)
			{
				case I2C_STATUS_START_W:
					i2c.state = I2C_STATE_ADDRESS;
					i2c.num_bytes = 0;
					break;
				case I2C_STATUS_BYTE_R:
					i2c.num_bytes++;
					switch(i2c.state)
					{
						case I2C_STATE_ADDRESS:
							i2c.reg_addr = TWDR;
							i2c.state = I2C_STATE_DATA;
							break;
						case I2C_STATE_DATA:
							i2c_buff_write(&TWDR, 1);
							break;
						default:
							i2c.state = I2C_STATE_IDLE;
					}
					break;
				case I2C_STATUS_STOP_W:
					if(i2c.num_bytes == 1)
					{
						i2c.mode = I2C_MODE_W;
					}
					else
					{
						i2c_write_reg(i2c.reg_addr);
					}
				default: // Reset I2C
					TWCR |= (1<<TWEA);
					i2c.num_bytes = 0;
					i2c_buff_flush();
					i2c.state = I2C_STATE_IDLE;
			}
			break;
		case I2C_MODE_W:
			switch(status)
			{
				case I2C_STATUS_START_R:
					i2c_load_reg(i2c.reg_addr);
					i2c.state = I2C_STATE_DATA;
				case I2C_STATUS_BYTE_W:
					if(i2c_buff_load_byte(&TWDR) || i2c_buff_empty())
					{
						TWCR &= ~(1<<TWEA);
					}
					break;
				case I2C_STATUS_NAK_W:
				case I2C_STATUS_STOP_R:
				default:
					i2c_buff_flush();
					TWCR |= (1<<TWEA);
					i2c.mode = I2C_MODE_R;
					i2c.state = I2C_STATE_IDLE;
					i2c.num_bytes = 0;
			}
	}
	TWCR |= (1<<TWINT);
}