var EventEmitter = require('events');

var I2cMaster = require('./i2cmaster.js');

var uuid = require('uuid');

class FanData
{
	constructor(id, controllerid, uuid, dutycycle, rpm)
	{
		this.id = id;
		this.controllerid = controllerid;
		this.uuid = uuid;
		this.dutycycle = dutycycle;
		this.rpm = rpm;
	}
}

class Fan extends EventEmitter
{
	constructor(id, controller)
	{
		super();
		this.controller = controller;
		this.id = id;
		this.uuid = uuid.v4();
	}

	update()
	{
		this.dutycycle = this.getDutyCycle();
		this.rpm = this.getRpm();
		this.emit('update');
	}

	getFanData()
	{
		return new FanData(this.id, this.controller.address, this.uuid, this.dutycycle, this.rpm);
	}

	setDutyCycle(dutyCycle)
	{
		var register = this.id * 2 + 1;
		this.controller.master.writeRegisterByte(this.controller.address, register, dutyCycle);
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

class Controller extends EventEmitter
{
	constructor(master, address)
	{
		super();
		this.address = address;
		this.master = master;
		this.numfans = this.getNumFans();
		this.fans = [];
		for(var i = 0; i < this.numfans; i++)
			this.fans[i] = new Fan(i, this);
		this.uuid = uuid.v4();
	}

	update()
	{
		this.forEach(fan => fan.update());
		this.emit('update');
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

class FanCtl extends EventEmitter
{
	constructor(i2cbus, address, interval=3000)
	{
		super();
		this.master = new I2cMaster(i2cbus);
		if(typeof(address) != 'object')
			address = [address];
		this.controllers = [];
		address.forEach(address =>
			this.controllers[address] = new Controller(this.master, address));
		this.buildFlatUidFanIndex();
		var fanctl = this;
		var updatefunc = function()
		{
			fanctl.update();
			fanctl.timeoutid = setTimeout(updatefunc, interval);
		};
		this.timeoutid = setTimeout(updatefunc, interval);
		this.uuid = uuid.v4();
	}

	buildFlatUidFanIndex()
	{
		this.fanindex = {};
		this.controllers.forEach(cntrl => cntrl.forEach(fan => {
				this.fanindex[fan.uuid] = fan;
		}));
	}

	getFanByUUID(id)
	{
		return this.fanindex[id];
	}

	update()
	{
		this.forEach(cntrl => cntrl.update());
		this.emit('update');
	}

	forEach(func)
	{
		this.controllers.forEach(cntrl => func(cntrl));
	}
}

module.exports = FanCtl
