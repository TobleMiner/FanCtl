var EventEmitter = require('events');

var I2cMaster = require('./i2cmaster.js');

var uuid = require('uuid');

var LinearScheduler = require('./scheduler.js');

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

	update(callback, cbdata)
	{
		var scheduler = new LinearScheduler();
		scheduler.enqueue(this.updateDutyCycle, this);
		scheduler.enqueue(this.updateRpm, this);
		scheduler.execute(function(fan)
		{
			fan.emit('update');
			if(callback)
				callback(cbdata);
		}, this);
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
		return this.dutycycle;
	}

	updateDutyCycle(callback, cbdata)
	{
		var register = this.id * 2 + 1;
		this.controller.master.readRegisterByte(this.controller.address, register, function(data)
		{
			data.cbdata.dutycycle = data.value;
			if(callback)
				callback(cbdata);
		}, this);
	}

	setRpm(rpm)
	{
		var register = this.id * 2 + 2;
		//this.controller.master.writeRegisterWord(this.controller.address, register, rpm);
	}

	getRpm()
	{
		return this.rpm;
	}

	updateRpm(callback, cbdata)
	{
		var register = this.id * 2 + 2;
		return this.controller.master.readRegisterWord(this.controller.address, register, function(data)
		{
			data.cbdata.rpm = data.value;
			if(callback)
				callback(cbdata);
		}, this);
	}
}

class Controller extends EventEmitter
{
	constructor(master, address)
	{
		super();
		this.address = address;
		this.master = master;
		var scheduler = new LinearScheduler();
		scheduler.enqueue(this.updateNumFans, this);
		scheduler.execute(function()
		{
			this.initFans();
			this.emit('ready');
		}, null, this);
		this.uuid = uuid.v4();
	}

	update(callback, cbdata)
	{
		var scheduler = new LinearScheduler();
		this.forEach(fan => scheduler.enqueue(fan.update, fan));
		scheduler.execute(function(controller)
		{
			controller.emit('update');
			if(callback)
				callback(cbdata);
		}, this);
	}

	initFans()
	{
		this.fans = [];
		for(var i = 0; i < this.numfans; i++)
			this.fans[i] = new Fan(i, this);
	}

	updateNumFans(callback, cbdata)
	{
		this.master.readRegisterByte(this.address, 0, function(data)
		{
			data.cbdata.controller.numfans = data.value;
			callback(cbdata);
		}, {controller: this});
	}

	getNumFans()
	{
		return this.numfans;
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
			fanctl.update(function(fanctl)
			{
				fanctl.timeoutid = setTimeout(updatefunc, interval);
			}, fanctl);
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

	update(callback, cbdata)
	{
		var scheduler = new LinearScheduler();
		this.forEach(cntrl => scheduler.enqueue(cntrl.update, cntrl));
		scheduler.execute(function(fanctl)
		{
			fanctl.emit('update');
			if(callback)
				callback(cbdata);
		}, this);
	}

	forEach(func)
	{
		this.controllers.forEach(cntrl => func(cntrl));
	}
}

module.exports = FanCtl
