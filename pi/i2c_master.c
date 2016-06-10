#include <inttypes.h>
#include <errno.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

int i2c_open(char* filename)
{
	return open(filename, O_RDWR);	
}

int i2c_close(int flhndl)
{
        return close(flhndl);
}


int i2c_read_register(int i2c, uint8_t address, uint8_t reg, uint8_t* dst, uint8_t length)
{
	int errno;
	if((errno = ioctl(i2c, I2C_SLAVE, address)) < 0)
	{
		printf("ioctl failed\n");
		return errno;
	}
	if(length < 1)
	{
		printf("Invalid register length\n");
		return -EINVAL;
	}
	dst[0] = reg;
	if((errno = write(i2c, dst, 1)) < 0)
	{
		printf("Failed to write register address\n");
		return errno;
	}
	if((errno = read(i2c, dst, length)) < 0)
	{
		printf("Failed to read register\n");
		return errno;
	}
	return 0;
}

int i2c_write_register(int i2c, uint8_t address, uint8_t reg, uint8_t* data, uint8_t length)
{
        int errno;
        if((errno = ioctl(i2c, I2C_SLAVE, address)) < 0)
        {
                printf("ioctl failed\n");
                return errno;
        }
        if(length < 1)
        {
                printf("Invalid register length\n");
                return -EINVAL;
        }
	uint8_t addrdata[length + 1];
        addrdata[0] = reg;
	memcpy(addrdata + 1, data, length);
        if((errno = write(i2c, addrdata, length + 1)) < 0)
        {
                printf("Failed to write register\n");
                return errno;
        }
        return 0;
}

