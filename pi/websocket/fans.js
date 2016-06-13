var I2cMaster = require('./i2cmaster.js');

class Fan
{
	constructor(id, controller)
	{
		this.controller = controller;
		this.id = id;
	}
}

class Controller
{
	constructor(master, address)
	{
		this.address = address;
		this.master = master;
		console.log(this.getNumFans());
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
}

module.exports = FanCtl
