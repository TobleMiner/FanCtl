var I2cMaster = require('./i2cmaster.js');

class Fan
{
	constructor(id, controller)
	{
		this.controller = controller;
		this.id = id;
	}

	setDutyCycle(dutyCycle)
	{
		var register = this.id * 2 + 1;
		//this.controller.master.writeRegisterByte(this.controller.address, register, dutyCycle);
	}

	getDutyCycle()
	{
		var register = this.id * 2 + 1;
		return this.controller.master.readRegisterByte(this.controller.address, register);
	}

	setRpm(rpm)
	{
		var register = this.id * 2 + 2;
		//this.controller.master.writeRegisterWord(this.controller.address, register, rpm);
	}

	getRpm()
	{
		var register = this.id * 2 + 2;
		return this.controller.master.readRegisterWord(this.controller.address, register);
	}
}

class Controller
{
	constructor(master, address)
	{
		this.address = address;
		this.master = master;
		this.numfans = this.getNumFans();
		this.fans = [];
		for(var i = 0; i < this.numfans; i++)
			this.fans[i] = new Fan(i, this);
	}

	getNumFans()
	{
		return this.master.readRegisterByte(this.address, 0);
	}
}

class FanCtl
{
	constructor(i2cbus, address)
	{
		this.master = new I2cMaster(i2cbus);
		if(typeof(address) != 'object')
			address = [address];
		this.controllers = []
		address.forEach(address =>
			this.controllers[address] = new Controller(this.master, address));
	}

	forEach(func)
	{
		this.controllers.forEach(cntrl => cntrl.fans.forEach(fan => func(fan)));
	}
}

module.exports = FanCtl
