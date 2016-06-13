var I2cMaster = require('./i2cmaster.js');

class FanData
{
	constructor(id, controllerid, dutycycle, rpm)
	{
		this.id = id;
		this.controllerid = controllerid;
		this.dutycycle = dutycycle;
		this.rpm = rpm;
	}
}

class Fan
{
	constructor(id, controller)
	{
		this.controller = controller;
		this.id = id;
	}

	getFanData()
	{
		return new FanData(this.id, this.controller.address, this.getDutyCycle(), this.getRpm());
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

	forEach(func)
	{
		this.fans.forEach(fan => func(fan));
	}
}

class FanCtl
{
	constructor(i2cbus, address)
	{
		this.master = new I2cMaster(i2cbus);
		if(typeof(address) != 'object')
			address = [address];
		this.controllers = [];
		address.forEach(address =>
			this.controllers[address] = new Controller(this.master, address));
		this.buildFanIndex();
	}

	buildFanIndex()
	{
		this.fanindex = {};
		var i = 0;
		this.controllers.forEach(cntrl => {
			this.fanindex[cntrl.address] = [];
			var j = 0;
			cntrl.forEach(fan => {
				this.fanindex[cntrl.address].push(fan.getFanData());
				j++;
			});
			i++;
		});
	}

	forEach(func)
	{
		this.controllers.forEach(cntrl => func(cntrl));
	}
}

module.exports = FanCtl
