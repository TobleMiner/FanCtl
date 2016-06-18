var i2c = require('i2c-bus');

class I2cAction
{
	constructor(action, address, register, length, callback, data)
	{
		this.action = action;
		this.address = address;
		this.register = register;
		this.data = data;
		this.length = length;
		this.callback = callback;
	}
}

class I2cMaster
{
	constructor(busid)
	{
		this.i2c = i2c.openSync(busid);
		this.queue = [];
	}

	enqueue(action)
	{
		this.queue.push(action);
		if(this.queue.length == 1)
			this.execQueue();
	}

	execQueue()
	{
		var job;
		while((job = this.queue.shift()))
		{
			if(job.action == 'read')
			{
				var buff = Buffer.alloc(1, job.register);
				this.i2c.i2cWriteSync(job.address, 1, buff);
				buff = Buffer.alloc(job.length, 0);
				this.i2c.i2cReadSync(job.address, job.length, buff);
				job.callback({data: buff, cbdata: job.cbdata});
			}
			else if(job.action == 'write')
			{
				var buff = Buffer.alloc(job.length + 1, job.register);
				job.data.copy(buff, 1);
				this.i2c.i2cWriteSync(job.address, buff.length, buff);
				job.callback({cbdata: job.cbdata});
			}
			else
			{
				throw new Error('Unknown action: ' + toString(job.action));
			}
		}
	}

	readRegisterByte(address, register, callback, cbdata)
	{
		this.enqueue(new I2cAction('read', address, register, 1, function(data)
		{
			if(callback)
			{
				var value = data.data[0];
				callback({value: value, cbdata: cbdata});
			}
		}));
	}

	writeRegisterByte(address, register, data, callback, cbdata)
	{
		var buff = Buffer.alloc(1, data);
		buff[0] = data;
		this.enqueue(new I2cAction('write', address, register, 1, function(data)
		{
			if(callback)
			{
				callback({cbdata: cbdata});
			}
		}, buff));
	}

	readRegisterWord(address, register, callback, cbdata)
	{
		this.enqueue(new I2cAction('read', address, register, 2, function(data)
		{
			if(callback)
			{
				var value = data.data[0] + (data.data[1] << 8);
				callback({value: value, cbdata: cbdata});
			}
		}));
	}

	writeRegisterWord(address, register, data, callback, cbdata)
	{
		var buff = Buffer.alloc(2);
		buff[1] = data & 0xFF;
		buff[2] = (data >> 8) & 0xFF;
		this.enqueue(new I2cAction('write', address, register, 2, function(data)
		{
			if(callback)
			{
				callback({cbdata: cbdata});
			}
		}, buff));
	}
}

module.exports = I2cMaster;
