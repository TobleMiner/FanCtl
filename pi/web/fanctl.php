<?php
	class Fanctl
	{
		public $numfans;
		private $buisd;
		private $address;

		function __construct($busid, $address)
		{
			$this->busid = $busid;
			$this->address = $address;
			$this->numfans = intval(exec("/usr/local/sbin/fanctl $busid $address get_num_fans"));
		}

		function get_speed($fan)
		{
			if($fan < 0 || $fan >= $this->numfans)
				return -1;
			return intval(exec("/usr/local/sbin/fanctl $this->busid $this->address get_rpm $fan"));
		}

		function get_duty_cycle($fan)
		{
			if($fan < 0 || $fan >= $this->numfans)
				return -1;
			return intval(exec("/usr/local/sbin/fanctl $this->busid $this->address get_duty_cycle $fan"));
		}

		function set_duty_cycle($fan, $dutycycle)
		{
			if($fan < 0 || $fan >= $this->numfans)
				return -1;
			return intval(exec("/usr/local/sbin/fanctl $this->busid $this->address set_duty_cycle $fan $dutycycle"));
		}

		function get_all_fans()
		{
			$fans = [];
			for ($i=0; $i < $this->numfans; $i++)
			{
				$fans[] = new Fan($i, $this->get_speed($i), $this->get_duty_cycle($i));
			}
			return $fans;
		}
	}

	class Fan
	{
		public $id;
		public $speed;
		public $dutycycle;

		public function __construct($id, $speed, $dutycycle)
		{
			$this->id = $id;
			$this->speed = $speed;
			$this->dutycycle = $dutycycle;
		}
	}
?>
