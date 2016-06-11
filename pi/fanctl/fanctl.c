#include "i2c_master.c"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/file.h>

char* lockfile = "/tmp/fanctl.lck";

int fan_get_cnt(int i2c, int address)
{
	uint8_t num_fans;
	i2c_read_register(i2c, address, 0, &num_fans, 1);
	return num_fans;
}

int fan_get_rpm(int i2c, int address, int fan)
{
	uint16_t speed;
	i2c_read_register(i2c, address, fan * 2 + 2, (uint8_t*)&speed, 2);
	return speed;
}

int fan_set_pwm_duty_cycle(int i2c, int address, int fan, int duty_cycle)
{
	i2c_write_register(i2c, address, fan * 2 + 1, (uint8_t*)&duty_cycle, 1);
}

int fan_get_pwm_duty_cycle(int i2c, int address, int fan)
{
	uint8_t duty_cycle;
	i2c_read_register(i2c, address, fan * 2 + 1, &duty_cycle, 1);
	return duty_cycle;
}

int main(int argc, char** argv)
{
	int error = 0;
	if(argc == 0)
	{
		error = -EINVAL;
		goto exit_;
	}
	if(argc < 4)
	{
		printf("USAGE: %s i2c-bus-id address command\n", argv[0]);
		error = -EINVAL;
		goto exit_;
	}
	int lckfd = open(lockfile, O_RDWR | O_CREAT, 0666);
	if(lckfd < 0)
	{
		error = errno;
		printf("Failed to open lockfile: %d\n", error);
		goto exit_;
	}
	if(flock(lckfd, LOCK_EX | LOCK_NB))
	{
		error = -EACCES;
		printf("Failed to obtain lock: %d\n", error);
		goto lock_fail;
	}
	int bus_id = atoi(argv[1]);
	int address = atoi(argv[2]);
	char* nodeprefix = "/dev/i2c-";
	char* devnode = malloc(strlen(nodeprefix) + strlen(argv[2]) + 1);
	sprintf(devnode, "%s%d", nodeprefix, bus_id);
	int i2c = i2c_open(devnode);
	int num_fans = fan_get_cnt(i2c, address);
	char* cmd = argv[3];
	if(strcmp(cmd, "info") == 0)
	{
		printf("Detected %d fans:\n", num_fans);
		int i;
		for(i = 0; i < num_fans; i++)
		{
			printf("\tFan %d:\n", i);
			int speed = fan_get_rpm(i2c, address, i);
			int duty_cycle = fan_get_pwm_duty_cycle(i2c, address, i);
			printf("\t\tSpeed: %d rpm\n", speed);
			printf("\t\tDuty cycle: %d\n", duty_cycle);
		}
	}
	else if(strcmp(cmd, "get_num_fans") == 0)
	{
		printf("%d\n", num_fans);
	}
	else if(strcmp(cmd, "get_rpm") == 0)
	{
		if(argc < 5)
		{
			printf("Usage: i2c-bus-id address get_rpm fan_id\n");
			error = -EINVAL;
			goto i2c_exit;
		}
		int fan_id = atoi(argv[4]);
		if(fan_id >= num_fans)
		{
			printf("fan_id can't be larger or equal to number of fans\n");
			error = -EINVAL;
			goto i2c_exit;
		}
		int speed = fan_get_rpm(i2c, address, fan_id);
		printf("%d\n", speed);
	}
	else if(strcmp(cmd, "get_duty_cycle") == 0)
	{
		if(argc < 5)
		{
			printf("Usage: i2c-bus-id address get_duty_cycle fan_id\n");
			error = -EINVAL;
			goto i2c_exit;
		}
		int fan_id = atoi(argv[4]);
		if(fan_id >= num_fans)
		{
			printf("fan_id can't be larger or equal to number of fans\n");
			error = -EINVAL;
			goto i2c_exit;
		}
		int duty_cycle = fan_get_pwm_duty_cycle(i2c, address, fan_id);
		printf("%d\n", duty_cycle);
	}
        else if(strcmp(cmd, "set_duty_cycle") == 0)
        {
                if(argc < 6)
                {
                        printf("Usage: i2c-bus-id address set_duty_cycle fan_id duty_cycle\n");
                        error = -EINVAL;
                        goto i2c_exit;
                }
                int fan_id = atoi(argv[4]);
		int duty_cycle = atoi(argv[5]);
                if(fan_id >= num_fans)
                {
                        printf("fan_id can't be larger or equal to number of fans\n");
                        error = -EINVAL;
                        goto i2c_exit;
                }
                fan_set_pwm_duty_cycle(i2c, address, fan_id, duty_cycle);
        }
	else
	{
		printf("Unknown command\n");
	}
i2c_exit:
	free(devnode);
	i2c_close(i2c);
	flock(lckfd, LOCK_UN);
lock_fail:
	close(lckfd);
exit_:
	exit(error);
}
