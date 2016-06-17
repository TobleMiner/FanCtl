class View
{
	update(model)
	{
		throw new Error('Not implemented');
	}

	destroy() { }
}

class ConnectionStateView extends View
{
	constructor()
	{
		super();
		this.indicator = document.getElementById('state-indicator');
	}

	showState(connected)
	{
		if(connected)
			this.indicator.innerText = 'Connection established ✓';
		else
			this.indicator.innerText = 'Connecting ...';
	}

	update(model)
	{
		this.showState(model.connected);
	}
}

class FanStateView extends View
{
	constructor(fanid)
	{
		super();
		this.fanid = fanid;
	}
}

class FanStateConsoleView extends FanStateView
{
	constructor(fanid)
	{
		super(fanid);
	}

	update(model)
	{
		var fan = model.getFan(this.fanid);
		console.log(this.fanid + ': dutycycle=' + fan.dutycycle + ' rpm=' + fan.rpm);
	}
}

class FanStateUiView extends FanStateView
{
	constructor(fanid)
	{
		super(fanid);
		this.fandom = new FanDom(this.fanid, 'fans');
	}

	destroy()
	{
		this.fandom.destroy();
	}

	update(model)
	{
		var fan = model.getFan(this.fanid);
		this.fandom.setPwm(fan.dutycycle);
		this.fandom.setRpm(fan.rpm);
	}
}

class Model
{
	constructor()
	{
		this.connected = false;
		this.fans = {};
	}

	addFan(id)
	{
		this.fans[id] = new Fan(id);
	}

	getFan(id)
	{
		return this.fans[id];
	}
}

class Fan
{
	constructor(id, dutycycle=0, rpm=0)
	{
		this.id = id;
		this.dutycycle = dutycycle;
		this.rpm = rpm;
	}
}

class Controller
{
	constructor(model)
	{
		this.model = model;
		this.views = [];
		this.server = null;
	}

	addView(view)
	{
		this.views.push(view);
		this.update();
	}

	removeView(view)
	{
		this.views.splice(this.views.indexOf(view), 1);
		view.destroy();
	}

	removeViewsByClass(clazz)
	{
		this.getViewsByClass(clazz).forEach(view => this.removeView(view));
	}

	getViewsByClass(clazz)
	{
		var views = []
		this.views.forEach(view => { if(view instanceof clazz) views.push(view); });
		return views;
	}

	update()
	{
		this.views.forEach(view => view.update(this.model));
	}

	connect()
	{
		this.model.connected = true;
		this.update();
	}

	disconnect()
	{
		this.model.connected = false;
		this.update();
	}

	initFans(init)
	{
		if(this.server != init.server)
		{
			console.log('Server instance changed! Reinitializing fans');
			this.removeViewsByClass(FanStateView);
			this.server = init.server;
			this.model.fans = {};
			init.fans.forEach(fanid => {
				this.model.addFan(fanid);
				this.addView(new FanStateConsoleView(fanid));
				this.addView(new FanStateUiView(fanid));
			});
		}
		this.update();
	}

	updateFan(fan)
	{
		this.model.fans[fan.uuid] = fan;
		this.update();
	}
}


$(document).ready(function()
{
	model = new Model();
	controller = new Controller(model);
	var view = new ConnectionStateView();
	controller.addView(view);

	var socket = io.connect();

	socket.on('connect', function()
	{
		console.log("Connected");
		controller.connect();
	});

	socket.on('faninit', function(init)
	{
		controller.initFans(init);
	});

	socket.on('fanupdate', function(fan)
	{
		controller.updateFan(fan);
	});

	socket.on('disconnect', function()
	{
		console.log("Disconnected");
		controller.disconnect();
	});
});
