<?php
	class Fighter extends ShipSystem{
		
		
		public $flightid;
		public $location = 0;
		public $id, $armour, $maxhealth, $powerReq, $output, $name, $displayName;
		public $damage = array();
		public $outputMod = 0;
		public $boostable = false;
		public $power = array();
		public $data = array();
		public $critData = array();
		public $fighter = true;
		public $systems = array();
		
		
		public $possibleCriticals = array();
		
			
		public $criticals = array();
		
		
		function __construct($armour, $maxhealth, $flight){
			parent::__construct($armour, $maxhealth, 0, 0 );
			
			$this->flightid = $flight;
			
			
		}
		
		
		public function addFrontSystem($system){
            
			$this->addSystem($system, 1);
            
        
        }
        
        public function addAftSystem($system){
            
			$this->addSystem($system, 2);
            
        
        }
		
		
		protected function addSystem($system, $loc){
            
            $i = sizeof($this->systems);
            $system->location = $loc;
            $this->systems[$i] = $system;
            
        
        }
			
		public function setSystemDataWindow($turn){
			parent::setSystemDataWindow($turn);			
			foreach ($this->systems as $system){
				$system->setSystemDataWindow($turn);	
			}
		}
		
		public function onConstructed($ship, $turn, $phase){
			parent::onConstructed($ship, $turn, $phase);	
			foreach ($this->systems as $system){
				$system->onConstructed($ship, $turn, $phase);
			}
     
		}
		
		public function testCritical($ship, $turn, $crits, $add = 0){
						
			return $crits;
			 
		}
		
		
		public function isOfflineOnTurn($turn){
		
			return false;
		
		}
		
		public function isOverloadingOnTurn($turn){
			
			return false;
		
		}
		
		 public function getArmourPos($target, $pos){
            $tf = $target->getFacingAngle();
            $shooterCompassHeading = mathlib::getCompassHeadingOfPos($target, $pos);
          
            return $this->doGetArmour($tf,  $shooterCompassHeading);
        }
        
        public function getArmour($target, $shooter){
            $tf = $target->getFacingAngle();
            $shooterCompassHeading = mathlib::getCompassHeadingOfShip($target, $shooter);
          
            return $this->doGetArmour($tf,  $shooterCompassHeading);
            
        }
        
        
        public function doGetArmour($tf, $shooterCompassHeading){
            if (mathlib::isInArc($shooterCompassHeading, Mathlib::addToDirection(330,$tf), Mathlib::addToDirection(30,$tf) )){
               return $this->armour[0];
            }else if (mathlib::isInArc($shooterCompassHeading, Mathlib::addToDirection(150,$tf), Mathlib::addToDirection(210,$tf) )){
                return $this->armour[1];
            }else if (mathlib::isInArc($shooterCompassHeading, Mathlib::addToDirection(210,$tf), Mathlib::addToDirection(330,$tf) )){
                return $this->armour[2];
            }  else if (mathlib::isInArc($shooterCompassHeading, Mathlib::addToDirection(30,$tf), Mathlib::addToDirection(150,$tf) )){
                return $this->armour[3];
            } 
                
            return $this->armour[0];
        }
        

	}

?>