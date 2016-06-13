var i2c = require('i2c-bus');

class I2cMaster
{
	constructor(busid)
	{
		this.i2c = i2c.openSync(busid);
	}

	readRegisterByte(address, register)
	{
		var buff = Buffer.alloc(1, register);
		this.i2c.i2cWriteSync(address, 1, buff);
		this.i2c.i2cReadSync(address, 1, buff);
		return buff[0];
	}

	writeRegisterByte(address, register, data)
	{
		var buff = Buffer.alloc(2, register);
		buff[1] = data;
		this.i2c.i2cWriteSync(address, 2, buff);
	}

	readRegisterWord(address, register)
	{
		var buff = Buffer.alloc(2, register);
		this.i2c.i2cWriteSync(address, 1, buff);
		this.i2c.i2cReadSync(address, 2, buff);
		return buff[0] + buff[1] << 8;
	}

	writeRegisterWord(address, register, data)
	{
		var buff = Buffer.alloc(3, register);
		buff[1] = data & 0xFF;
		buff[2] = data >> 8 & 0xFF;
		this.i2c.i2cWriteSync(address, 3, buff);
	}
}

module.exports = I2cMaster;
