class ConnectionStateView
{
	constructor()
	{
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

class Model
{
	constructor()
	{
		this.connected = false;
	}

	setConnectionState()
	{

	}
}

class Fan
{
	
}

class Controller
{
	constructor(model)
	{
		this.model = model;
		this.views = [];
	}

	addView(view)
	{
		this.views.push(view);
		this.update();
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

	socket.on('disconnect', function()
	{
		console.log("Disconnected");
		controller.disconnect();
	});
});
