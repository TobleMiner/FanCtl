/*
Copyright (c) 2014 Tobias Schramm

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

#include <avr/interrupt.h>

#if UART_ENABLE_RX == TRUE
volatile uint8_t uart_rx_ring[UART_BUFF_LEN_RX] = {0}; //Init buffer for uart-rx
volatile uint8_t *uart_rx_curpos_ring = uart_rx_ring;
volatile uint8_t *uart_rx_targpos_ring = uart_rx_ring;
volatile uint32_t uart_rx_data_len = 0;
#endif

#if UART_ENABLE_TX == TRUE
volatile uint8_t uart_tx_ring[UART_BUFF_LEN_TX] = {0}; //Init buffer for uart-tx
volatile uint8_t *uart_tx_curpos_ring = uart_tx_ring;
volatile uint8_t *uart_tx_targpos_ring = uart_tx_ring;
volatile uint32_t uart_tx_data_len = 0;
#endif

///Initializes the UART. Also sets the baudrate specified in config.h
void uart_init(void)
{
	uart_set_baudrate(UART_BAUDRATE);
	UCSR0C = (1<<USBS0) | (1<<UCSZ01) | (1<<UCSZ00); //8 data bits, 2 stop bits
}

///Sets the baudrate. Should be called before uart_init_tx()
void uart_set_baudrate(uint32_t baudrate)
{
	UBRR0 = (((F_CPU / (baudrate * 16.0)) + .5) - 1);
}

#if UART_ENABLE_RX == TRUE
///Enables the UART receiver
void uart_init_rx(void)
{
	UCSR0B |= (1<<RXCIE0) | (1<<RXEN0);
	#if UART_ENABLE_FLOWCONTROL == TRUE
		UART_CTS_DDR |= (1<<UART_CTS_PIN);
		#if UART_CTS_INVERTED
			UART_CTS_PORT &= ~(1<<UART_CTS_PIN);
		#else
			UART_CTS_PORT |= (1<<UART_CTS_PIN);
		#endif
	#endif
}

///Returns the amount of data available from the uart rx buffer
uint32_t uart_data_available(void)
{
	return uart_rx_data_len;
}

///Reads up to the specified amount of data to the given buffer.
///Returns the actual length the read data.
uint32_t uart_read(uint8_t* data, uint32_t len)
{
	volatile uint8_t* uart_rx_targpos_ring_tmp = uart_rx_targpos_ring;
	uint32_t tlen = 0;
	uint8_t* tptr = data;
	while(tlen < len && uart_rx_curpos_ring != uart_rx_targpos_ring_tmp)
	{
		*tptr = *uart_rx_curpos_ring;
		tptr++;
		tlen++;
		uart_rx_curpos_ring++;
		if(uart_rx_curpos_ring >= UART_BUFF_LEN_RX + uart_rx_ring) //Wrap pointer if necessary
		{
			uart_rx_curpos_ring = uart_rx_ring;
		}
	}
	uart_rx_data_len -= tlen;
	#if UART_ENABLE_FLOWCONTROL == TRUE
		if(uart_rx_data_len < UART_FLOWCONTROL_BUFF_FILL)
		#if UART_CTS_INVERTED
			UART_CTS_PORT &= ~(1<<UART_CTS_PIN);
		#else
			UART_CTS_PORT |= (1<<UART_CTS_PIN);
		#endif
	#endif
	return tlen;
}

///Reads a <LF> terminated string from the rx buffer to the given buffer.  
///Discards <CR>'s. Returns the actual length of the data read.
uint32_t uart_read_line(char* str)
{
	volatile uint8_t* uart_rx_targpos_ring_tmp = uart_rx_targpos_ring;
	uint32_t tlen = 0;
	uint32_t rlen = 0;
	char* tptr = str;
	uint8_t do_break = FALSE;
	while(uart_rx_curpos_ring != uart_rx_targpos_ring_tmp)
	{
		if(*uart_rx_curpos_ring != 0x0D && *uart_rx_curpos_ring != 0x0A) //Skip <CR>
		{
			*tptr = (char)*uart_rx_curpos_ring;
			tptr++;
			tlen++;
		}
		rlen++;
		if(*uart_rx_curpos_ring == 0x0D)
			do_break = TRUE;
		uart_rx_curpos_ring++;
		if(uart_rx_curpos_ring >= UART_BUFF_LEN_RX + uart_rx_ring) //Wrap pointer if necessary
			uart_rx_curpos_ring = uart_rx_ring;
		if(do_break)
			break;
	}
	uart_rx_data_len -= rlen;
	#if UART_ENABLE_FLOWCONTROL == TRUE
		if(uart_rx_data_len < UART_FLOWCONTROL_BUFF_FILL)
		#if UART_CTS_INVERTED
			UART_CTS_PORT &= ~(1<<UART_CTS_PIN);
		#else
			UART_CTS_PORT |= (1<<UART_CTS_PIN);
		#endif
	#endif
	*tptr = 0;
	return tlen;
}

///Flushes the rx buffer
void uart_flush_rx(void)
{
	uart_rx_data_len = 0;
	uart_rx_curpos_ring = uart_rx_targpos_ring;
}

///Returns the amount of data stored in the tx buffer
uint32_t uart_get_tx_buff_fill(void)
{
	return uart_tx_data_len;
}

///Function that must be called when the UART RX interrupt is handled by 
///the program using this lib
void uart_irq_rx(uint8_t udr)
{
	volatile uint8_t *tmpptr = uart_rx_targpos_ring;
	*tmpptr = udr; //Read received byte to ringbuffer
	tmpptr++;
	if(tmpptr >= UART_BUFF_LEN_RX + uart_rx_ring) //Wrap pointer if necessary
	{
		tmpptr = uart_rx_ring;
	}
	uart_rx_targpos_ring = tmpptr;
	uart_rx_data_len++;
	#if UART_ENABLE_FLOWCONTROL == TRUE
		if(uart_rx_data_len > UART_FLOWCONTROL_BUFF_FILL)
			#if UART_CTS_INVERTED
				UART_CTS_PORT |= (1<<UART_CTS_PIN);
			#else
				UART_CTS_PORT &= ~(1<<UART_CTS_PIN);
			#endif
	#endif
}

#if UART_IRQ_HOOK_RX != TRUE
ISR(USART_RX_vect)
{
	uart_irq_rx(UDR0);
}
#endif
#endif

#if UART_ENABLE_TX == TRUE
void uart_init_tx(void)
{
	UCSR0B |= (1<<TXCIE0) | (1<<TXEN0);
}

///Sends one byte via the UART
void uart_send_byte(uint8_t byte)
{
	volatile uint8_t *tmpptr = uart_tx_targpos_ring;
	*tmpptr = byte; //Append byte to ringbuffer
	tmpptr++;
	if(tmpptr >= UART_BUFF_LEN_TX + uart_tx_ring) //Wrap pointer if necessary
	{
		tmpptr = uart_tx_ring;
	}
	if(uart_tx_targpos_ring == uart_tx_curpos_ring) //UART isn't busy
	{
		UCSR0B |= (1<<UDRIE0); //uart0: Enable uart data-register-empty interrupt
	}
	uart_tx_targpos_ring = tmpptr;
	uart_tx_data_len++;
}

///Asynchronously transmits the given data via UART
void uart_send_async(uint8_t* data, uint16_t offset, uint16_t len)
{
	UCSR0B &= ~(1<<TXCIE0); //uart0: Disable tx complete interrupt
	data += offset;
	for(; len > 0; len--)
	{
		uart_send_byte(*data);
		data++;
	}
	UCSR0B |= (1<<TXCIE0); //uart0: Enable tx complete interrupt
}

///Asynchronously transmits the given null terminated string via the UART
void uart_write_async(char* str)
{
	UCSR0B &= ~(1<<TXCIE0); //uart0: Disable tx complete interrupt
	while(*str)
	{
		uart_send_byte((unsigned char)*str);
		str++;
	}
	UCSR0B |= (1<<TXCIE0); //uart0: Enable tx complete interrupt
}

///This function must be called when the overlying application handles the
///UART tx interrupt.
void uart_irq_tx(void)
{
	if(uart_tx_curpos_ring != uart_tx_targpos_ring)
	{
		UDR0 = *uart_tx_curpos_ring; //Write byte from ringbuffer to UART
		uart_tx_curpos_ring++;
		if(uart_tx_curpos_ring >= UART_BUFF_LEN_TX + uart_tx_ring) //Wrap pointer if necessary
		{
			uart_tx_curpos_ring = uart_tx_ring;
		}
		uart_tx_data_len--;
	}
}

#if UART_IRQ_HOOK_TX != TRUE
ISR(USART_TX_vect)
{
	uart_irq_tx();
}
#endif

///This function must be called when the overlying application handles the
///UART data register empty interrupt.
void uart_irq_udre(void)
{
	UDR0 = *uart_tx_curpos_ring; //Push first byte to UDR to start the transmission
	uart_tx_curpos_ring++;
	if(uart_tx_curpos_ring >= UART_BUFF_LEN_TX + uart_tx_ring) //Wrap pointer if necessary
	{
		uart_tx_curpos_ring = uart_tx_ring;
	}
	UCSR0B &= ~(1<<UDRIE0); //uart0: Disable uart data-register-empty interrupt
	uart_tx_data_len--;
}

#if UART_IRQ_HOOK_UDRE != TRUE
ISR(USART_UDRE_vect)
{
	uart_irq_udre();
}
#endif
#endif