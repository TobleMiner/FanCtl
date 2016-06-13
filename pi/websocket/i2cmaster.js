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

	}

	readRegisterWord(address, register)
	{

	}

	writeRegisterWord(address, register, data)
	{

	}
}

module.exports = I2cMaster;
