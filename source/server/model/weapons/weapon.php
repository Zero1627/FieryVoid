<?php


class Weapon extends ShipSystem{

    public $weapon = true;
    
    public $name = null;
    public $displayName ="";
    
    public $animation = "none";
    public $animationImg = null;
    public $animationImgSprite = 0;
    public $animationColor = null;
    public $animationWidth = 3;
    public $animationExplosionScale = 0.25;
    public $animationExplosionType = "normal";
    public $explosionColor = array(250, 230, 80);
    public $trailLength = 40;
    public $trailColor = array(248, 216, 65);
    
    public $rangePenalty = 0;
    public $rangeDamagePenalty = 0;
    public $dp = 0; //damage penalty per dice
    public $range = 0;
    public $fireControl =  array(0, 0, 0); // fighters, <mediums, <capitals 
    public $piercing = false;
    
    public $loadingtime = 1;
    public $turnsloaded;
    
    public $overloadable = false;
    
    public $normalload = 0;
    public $overloadturns = 0;
    public $overloadshots = 0;
    public $extraoverloadshots = 0;
    
    public $uninterceptable = false;
    public $intercept = 0;
    public $freeintercept = false;
    
    public $ballistic = false;
    public $hextarget = false;
    public $hidetarget = false;
    
    
    public $shots = 1;
    public $defaultShots = 1;
    public $canChangeShots = false;
    
    public $grouping = 0;
    public $guns = 1;
    public $projectilespeed = 17;
    
    public $rof = 2;
    
    public $firingMode = 1;
    public $firingModes = array( 1 => "Standard");
    
    public $flashDamage = false;
    public $damageType = "standard";
    public $minDamage, $maxDamage;
    
    public $exclusive = false;
    
    
    
    public $possibleCriticals = array(14=>"ReducedRange", 19=>"ReducedDamage", 25=>array("ReducedRange","ReducedDamage"));
    
    function __construct($armour, $maxhealth, $powerReq, $startArc, $endArc ){
        parent::__construct($armour, $maxhealth, $powerReq, 0 );
         
        $this->startArc = (int)$startArc;
        $this->endArc = (int)$endArc;
       
        $this->setMinDamage();
        $this->setMaxDamage();
        
    }
    
    public function getWeaponForIntercept(){
        return $this;
    }
    
    public function getAvgDamage(){
        $min = $this->minDamage;
        $max = $this->maxDamage;
        $avg = round(($min+$max)/2);
        return $avg;
    }
   
    
    public function effectCriticals(){
        parent::effectCriticals();
        foreach ($this->criticals as $crit){
            if ($crit instanceof ReducedRange){
                
                if ($this->rangePenalty != 0){
                    if ($this->rangePenalty >= 1){
                        $this->rangePenalty += 1;
                    }else{
                        $this->rangePenalty = 1/(round(1/$this->rangePenalty)-1);
                    }
                    
                }
                
                if ($this->range != 0){
                    $this->range = round($this->range *0.75);
                }
                
            }
            
            if ($crit instanceof ReducedDamage){
                $min = $this->minDamage * 0.25;
                $max = $this->maxDamage * 0.25;
                $avg = round(($min+$max)/2);
                $this->dp = $avg;
            }
        }
    
         
        $this->setMinDamage();
        $this->setMaxDamage();
    
    }
    
    public function getNormalLoad(){
        if ($this->normalload == 0){
            return $this->loadingtime;
        }
        return $this->normalload;
    }
    
    public function firedOnTurn($turn){
        
        if ($this instanceof DualWeapon && isset($this->turnsFired[$turn]))
            return true;
        
        foreach ($this->fireOrders as $fire){
            if ($fire->weaponid == $this->id && $fire->turn == $turn){
                return true;
            }
        }
        return false;
    }
    
    public function setSystemDataWindow($turn){

        $this->data["Loading"] = $this->turnsloaded."/".$this->getNormalLoad();
        
        $dam = $this->minDamage."-".$this->maxDamage;
        if ($this->minDamage == $this->maxDamage)
            $dam = $this->maxDamage;
            
        $this->data["Damage"] = $dam;
        
        if ($this->rangePenalty > 0){
            $this->data["Range penalty"] = number_format(($this->rangePenalty * 5), 2) . " per hex";
        }else{
            $this->data["Range"] = $this->range;
        }
        
        //public $fireControl =  array(0, 0, 0); // fighters, <mediums, <capitals 
        
        $fcfight = number_format(($this->fireControl[0] * 5), 0);
        $fcmed = number_format(($this->fireControl[1] * 5), 0);
        $fccap = number_format(($this->fireControl[2] * 5), 0);
        
        $this->data["Fire control (fighter/med/cap)"] = "$fcfight/$fcmed/$fccap";
        
        if ($this->guns > 1){
            $this->data["Number of guns"] = $this->guns;
        }
        
        if ($this->shots > 1){
            $this->data["Number of shots"] = $this->shots;
        }
        
        if ($this->intercept > 0){
            $this->data["Intercept"] = "-".$this->intercept*5;
        }

        
        $misc = array();
        
        if ($this->overloadturns > 0){
            $misc[] = " OVERLOADABLE";
        }
        if ($this->uninterceptable)
            $misc[] = " UNINTERCEPTABLE";
        
        //if (sizeof($misc)>0)
            //$this->data["Misc"] = $misc;
    
        parent::setSystemDataWindow($turn);
    }
    
    public function onAdvancingGamedata($ship)
    {
        $data = $this->calculateLoading();
        if ($data)
            SystemData::addDataForSystem($this->id, 0, $ship->id, $data->toJSON());
    }
    
    public function setSystemData($data, $subsystem)
    {
        $array = json_decode($data, true);
        if (!is_array($array))
            return;
        
        foreach ($array as $i=>$entry)
        {
            if ($i == "loading"){
                $loading = new WeaponLoading(
                    $entry[1],
                    $entry[2],
                    $entry[3],
                    $entry[4]
                );
                
                $this->setLoading($loading);
            }
        }
    }
    
    public function setInitialSystemData($ship)
    {
        $data = $this->getStartLoading();
        if ($data)
            SystemData::addDataForSystem($this->id, 0, $ship->id, $data->toJSON());
    }
    
    public function getStartLoading()
    {
        return new WeaponLoading($this->getNormalLoad(), 0, 0, 0);
    }
    
    public function setLoading( $loading )
    {
        if (!$loading)
            return;
        
        $this->overloadturns = $loading->overloading;
        $this->overloadshots = $loading->extrashots;
        $this->turnsloaded = $loading->loading;
    }
    
    protected function getLoadedAmmo()
    {
        return 0;
    }    
    
    public function calculateLoading()
    {
        $normalload = $this->getNormalLoad();
        if (TacGamedata::$currentPhase == 2)
        {
            if ( $this->isOfflineOnTurn(TacGamedata::$currentTurn) )
            {
                return new WeaponLoading(0, 0, $this->getLoadedAmmo(), 0);
            }
            else if ($this->ballistic && $this->firedOnTurn(TacGamedata::$currentTurn) )
            {
                return new WeaponLoading(0, 0, $this->getLoadedAmmo(), 0);
            }
            else if (!$this->isOverloadingOnTurn(TacGamedata::$currentTurn))
            {
                return new WeaponLoading($this->turnsloaded, 0, $this->getLoadedAmmo(), 0);
            }
        }
        else if (TacGamedata::$currentPhase == 4)
        {
           return $this->calculatePhase4Loading();
        }
        else if (TacGamedata::$currentPhase == 1)
        {
            if ($this->overloadshots === -1)
            {
                return new WeaponLoading(0, 0, $this->getLoadedAmmo(), 0);
            }
            else
            {
                $newloading = $this->turnsloaded+1;
                if ($newloading > $normalload)
                    $newloading = $normalload;
                
                $newExtraShots = $this->overloadshots;
                $overloading = $this->overloadturns+1;
                if ($overloading == $normalload && $newExtraShots == 0)
                    $newExtraShots = $this->extraoverloadshots;

                if ($overloading > $normalload)
                    $overloading = $normalload;

                return new WeaponLoading($newloading, $newExtraShots, $this->getLoadedAmmo(), $overloading);
            }
            
        }
        
        return new WeaponLoading($this->turnsloaded, $this->overloadshots, $this->getLoadedAmmo(), $this->overloadturns);
    }
    
    private function calculatePhase4Loading()
    {
        if ($this->ballistic)   
            return null;
        
            
        if ($this->firedOnTurn(TacGamedata::$currentTurn)){
            /* if overloading ja ampuu:
             
                    JOS ON EXTRASHOTTEJA laske extrashotteja. Jos extrashotit menee nollaan, pistä -1 (cooldown)
                    ja loading ja overloading 0
             * 
             *      JOS EI OLE EXTRASHOTTEJA: laske overloading ja loading 0
           */
            
            if ($this->overloadshots > 0)
            {
                $newExtraShots = $this->overloadshots-1;
                //if you have extra shots use them
                if ($newExtraShots === 0)
                {
                    //if extra shots are reduced to zero, go to cooldown
                    return new WeaponLoading(0, -1, $this->getLoadedAmmo(), 0);
                }
                else
                {
                    //if you didn't use the last extra shot, keep on going.
                    return new WeaponLoading($this->turnsloaded, $newExtraShots, $this->getLoadedAmmo(), $this->overloadturns);
                }
            }
            else
            {
                //Situation normal, no overloading -> lose loading
                return new WeaponLoading(0, 0, $this->getLoadedAmmo(), 0);
            }
            
        }else{
              //cannot save the extra shots from everload -> lose loading and cooldown
            if ($this->overloadshots > 0 && $this->overloadshots < $this->extraoverloadshots)
                return new WeaponLoading(0, -1, $this->getLoadedAmmo(), 0);
        }
        
        return new WeaponLoading($this->turnsloaded, $this->overloadshots, $this->getLoadedAmmo(), $this->overloadturns);
    }
    
    public function beforeTurn($ship, $turn, $phase){
        parent::beforeTurn($ship, $turn, $phase);
    }
    
    public function getDamage($fireOrder){
        return 0;
    }
    
    public function setMinDamage(){
    
    }
    
    public function setMaxDamage(){
    
    }
    
    public function calculateRangePenalty($pos, $target){
        $targetPos = $target->getCoPos();
        $dis = mathlib::getDistanceHex($pos, $targetPos);
        
        $rangePenalty = ($this->rangePenalty*$dis);
        $notes = "shooter: ".$pos["x"].",".$pos["y"]." target: ".$targetPos["x"].",".$targetPos["y"]." dis: $dis, rangePenalty: $rangePenalty";
        return Array("rp"=>$rangePenalty, "notes"=>$notes);
    }
    
    public function calculateHit($gamedata, $fireOrder){
    
        $shooter = $gamedata->getShipById($fireOrder->shooterid);
        $target = $gamedata->getShipById($fireOrder->targetid);
        $pos = $shooter->getCoPos();
        $jammermod = 0;
        
        $defence = 0;
        if ($this->ballistic){
            $movement = $shooter->getLastTurnMovement($fireOrder->turn);
            $pos = mathlib::hexCoToPixel($movement->x, $movement->y);
            $defence = $target->getDefenceValuePos($pos);
        }else{
            $defence = $target->getDefenceValue($shooter);
        }
                       
        $rp = $this->calculateRangePenalty($pos, $target);
        $rangePenalty = $rp["rp"];
        
        $dew = $target->getDEW($gamedata->turn);
        if ($shooter instanceof FighterFlight)
			$dew = 0;
		
        $bdew = 0;
        
		if ($target instanceof FighterFlight){
			if (!($shooter instanceof FighterFlight) || mathlib::getDistance($shooter->getCoPos(),  $target->getCoPos()) > 0 
				||  Movement::getCombatPivots($shooter, $gamedata->turn) > 0){
				$dew = Movement::getJinking($target, $gamedata->turn);
			}
			
		}else{
            $bdew += EW::getBlanketDEW($gamedata, $target);
        }
		
		$mod = 0;
        
        $sdew = EW::getSupportedDEW($gamedata, $target);
        $soew = EW::getSupportedOEW($gamedata, $shooter, $target);
        $dist = EW::getDistruptionEW($gamedata, $shooter);
        
        $oew = $shooter->getOEW($target, $gamedata->turn);
        $oew -= $dist;
        
        if ($oew < 0)
            $oew = 0;
        
        if ($shooter instanceof FighterFlight){
			$oew = $shooter->offensivebonus;
			$mod -= Movement::getJinking($shooter, $gamedata->turn);
            
            if (Movement::getCombatPivots($shooter, $gamedata->turn)>0)
                $mod -= 1;
		}
        
        if ($this->piercing && $this->firingMode == 2)
            $mod -= 4;
       
        if (!($shooter instanceof FighterFlight))
        {
            if (Movement::hasRolled($shooter, $gamedata->turn) && !$this->ballistic)
                $mod -=3;

            if (Movement::hasPivoted($shooter, $gamedata->turn) && !$this->ballistic)
                $mod -=3;
        }
        if ($fireOrder->calledid != -1){
			$mod -= 8;
		}
		
		$mod -= $target->getHitChangeMod($shooter, $pos, $gamedata->turn);
		
        if ($oew < 1)
        {
            $rangePenalty = $rangePenalty*2;
        }
        else
        {
            $jammerValue = $target->getSpecialAbilityValue("Jammer", array("shooter"=>$shooter, "target"=>$target));
            if ($jammerValue > 0)
            {
                $jammermod = $rangePenalty*$jammerValue;
                if ($target instanceof FighterFlight){
                    if ( $dew > $jammermod){
                        $jammermod = 0;
                    }
                    else{
                        $dew = 0;
                    }
                }
            }
        }
            
        if (!($shooter instanceof FighterFlight)){
			$CnC = $shooter->getSystemByName("CnC");
			$mod -= ($CnC->hasCritical("PenaltyToHit", $gamedata->turn-1));
		}
        $firecontrol =  $this->fireControl[$target->getFireControlIndex()];
        
        $intercept = $this->getIntercept($gamedata, $fireOrder);
            
        $goal = ($defence - $dew - $bdew - $sdew - $jammermod - $rangePenalty - $intercept + $oew + $soew + $firecontrol + $mod);
        
        $change = round(($goal/20)*100);
        
        
        $notes = $rp["notes"] . ", DEW: $dew, BDEW: $bdew, SDEW: $sdew, Jammermod: $jammermod, OEW: $oew, SOEW: $soew, defence: $defence, intercept: $intercept, F/C: $firecontrol, mod: $mod, goal: $goal, chance: $change";
        
        $fireOrder->needed = $change;
        $fireOrder->notes = $notes;
        $fireOrder->updated = true;
    }
    
    public function getIntercept($gamedata, $fireOrder){
    
        $count = 0;
        $intercept = 0;
        if ($this->uninterceptable)
            return 0;
    
		$shooter = $gamedata->getShipById($fireOrder->shooterid);
        foreach ($gamedata->ships as $ship){
            $fireOrders = $ship->getAllFireOrders();
            foreach ($fireOrders as $fire){
                if ($fire->type == "intercept" && $fire->targetid == $fireOrder->id){
                    
                    $deg = $count;
                    if ($this->ballistic)
                        $deg = 0;
                    
                    $i = ($ship->getSystemById($fire->weaponid)->intercept - $deg);
                    if ($i<0)
                        $i = 0;
                    
                    if ($shooter instanceof FighterFlight)
						$deg--;
                    
                    $intercept += $i;
                    $count++;
                }
            }
        }
        
        return $intercept;
        
    }
    
    public function getNumberOfIntercepts($gamedata, $fireOrder){
        $count = 0;
            
        foreach ($gamedata->ships as $ship){
            $fireOrders = $ship->getAllFireOrders();
            foreach ($fireOrders as $fire){
                if ($fire->type == "intercept" && $fire->targetid == $fireOrder->id){
                    $count++;
                    
                }
            }
        }
        
        return $count;
    }
    
    public function fire($gamedata, $fireOrder){
    
        $shooter = $gamedata->getShipById($fireOrder->shooterid);
        $target = $gamedata->getShipById($fireOrder->targetid);
        $this->firingMode = $fireOrder->firingMode;
        
        $pos = $shooter->getCoPos();
        if ($this->ballistic){
            $movement = $shooter->getLastTurnMovement($fireOrder->turn);
            $pos = mathlib::hexCoToPixel($movement->x, $movement->y);
        }
                    
        $this->calculateHit($gamedata, $fireOrder);
        $intercept = $this->getIntercept($gamedata, $fireOrder);
        
        for ($i=0;$i<$fireOrder->shots;$i++){
            // Check if, in case of ballistic weapons, the target
            // moved out of launch range
            // Put in here and not before the for loop to account
            // for future update that e.g. torpedos are fired at
            // multiple targets.
            if ($this->ballistic)
            {
                $jammerValue = $target->getSpecialAbilityValue("Jammer", array("shooter"=>$shooter, "target"=>$target));
                $range = $this->range;

                // Account for reduced launch range in case of jammer.
                if ($jammerValue > 0)
                {
                    $range = $range/($jammerValue+1);
                }

                if(mathlib::getDistanceHex($pos,  $target->getCoPos()) > $range)
                {
                    $fireOrder->pubnotes .= " FIRING SHOT ". ($i+1) .": Target moved out of launch range.";
                    continue;
                }
            }

            $needed = $fireOrder->needed - ($this->grouping*$i);
            $rolled = Dice::d(100);
            if ($rolled > $needed && $rolled <= $needed+($intercept*5)){
                //$fireOrder->pubnotes .= "Shot intercepted. ";
                $fireOrder->intercepted += 1;
            }
            
            $fireOrder->notes .= " FIRING SHOT ". ($i+1) .": rolled: $rolled, needed: $needed\n";
            if ($rolled <= $needed){
                $fireOrder->shotshit++;
                $this->beforeDamage($target, $shooter, $fireOrder, $pos, $gamedata);
            }
        }
        
        $fireOrder->rolled = 1;//Marks that fire order has been handled
                
    }
    
    protected function beforeDamage($target, $shooter, $fireOrder, $pos, $gamedata)
    {
        if ($this->piercing && $this->firingMode == 2){
            $this->piercingDamage($target, $shooter, $fireOrder, $pos, $gamedata);
        }else{
            $damage = $this->getFinalDamage($shooter, $target, $pos, $gamedata, $fireOrder);
            $this->damage($target, $shooter, $fireOrder, $pos, $gamedata, $damage);
        }
        
        
    }
    
    protected function piercingDamage($target, $shooter, $fireOrder, $pos, $gamedata)
    {
        
        if ($target->isDestroyed())
            return;
        
        $damage = $target->getPiercingDamagePerLoc(
                $this->getFinalDamage($shooter, $target, $pos, $gamedata, $fireOrder)
            );
        $locs = $target->getPiercingLocations($shooter, $pos, $gamedata->turn, $this);
        
        foreach ($locs as $loc){
            $system = $target->getHitSystem($pos, $shooter, $fireOrder, $this, $loc);
            
            if (!$system)
                continue;
            
                
            $this->doDamage($target, $shooter, $system, $damage, $fireOrder, $pos, $gamedata);
        }
        
        
        
        
    }
    
    protected function getOverkillSystem($target, $shooter, $system, $pos, $fireOrder, $gamedata){
        if ($this->piercing && $this->firingMode == 2)
            return null;
        
		if ($target instanceof FighterFlight){
			return null;
		}
		
        if ($this->flashDamage){
            return $target->getHitSystem($pos, $shooter, $fireOrder, $this);
        }else{
            
            $okSystem = $target->getStructureSystem($system->location);
            
            if ($okSystem == null || $okSystem->isDestroyed()){
                $okSystem = $target->getStructureSystem(0);
            }
            if ($okSystem == null || $okSystem->isDestroyed()){
                return null;
            }
        }
        
        return $okSystem;
    
    }
   
    
    public function damage($target, $shooter, $fireOrder, $pos, $gamedata, $damage, $location = null){
        
        
        if ($target->isDestroyed())
            return;
       
		$system = $target->getHitSystem($pos, $shooter, $fireOrder, $this, $location);
		
        if ($system == null)
            return;
            
        $this->doDamage($target, $shooter, $system, $damage, $fireOrder, $pos, $gamedata);
            
        
        
    }
    
    protected function getSystemArmour($system, $gamedata, $fireOrder){
		
		$shooter = $gamedata->getShipById($fireOrder->shooterid);
        $target = $gamedata->getShipById($fireOrder->targetid);
     
		$armor = 0;
        if ($this->ballistic){
            $movement = $shooter->getLastTurnMovement($fireOrder->turn);
            $pos = mathlib::hexCoToPixel($movement->x, $movement->y);
            $armor = $system->getArmourPos($gamedata, $pos);
        }else{
            $armor = $system->getArmour($target, $shooter);
        }
		
		
        $mod = $system->hasCritical("ArmorReduced", $gamedata->turn-1);
        $armor -= $mod;
        if ($armor<0)
            $armor = 0;
            
        return $armor;
    }
    
    protected function getDamageMod($damage, $shooter, $target, $pos, $gamedata){
        if ($this->rangeDamagePenalty > 0){
            $targetPos = $target->getCoPos();
            $dis = round(mathlib::getDistanceHex($pos, $targetPos));
            
            //print ("damage: $damage dis: $dis damagepen: " . $this->rangeDamagePenalty);
            $damage -= ($dis * $this->rangeDamagePenalty);
            //print ("damage: $damage \n\n");
            if ($damage < 0)
                return 0;
        }
        
        $damage -= $this->dp;
        if ($damage < 0)
            return 0;
        
        return $damage;
    }
    
    protected function getFinalDamage($shooter, $target, $pos, $gamedata, $fireOrder){
    
        $damage = $this->getDamage($fireOrder);
        $damage = $this->getDamageMod($damage, $shooter, $target, $pos, $gamedata);
        $damage -= $target->getDamageMod($shooter, $pos, $gamedata->turn);
        
        return $damage;
    }
    
    protected function doDamage($target, $shooter, $system, $damage, $fireOrder, $pos, $gamedata){

        $armour = $this->getSystemArmour($system, $gamedata, $fireOrder );
        $systemHealth = $system->getRemainingHealth();
        $modifiedDamage = $damage;
        
        

        //print("damage: $damage armour: $armour\n");
            
        $destroyed = false;
        if ($damage-$armour >= $systemHealth){
            $destroyed = true;
            $modifiedDamage = $systemHealth + $armour;
            //print("destroying! rem: ".$system->getRemainingHealth()."\n");
        }
        
        
        $damageEntry = new DamageEntry(-1, $target->id, -1, $fireOrder->turn, $system->id, $modifiedDamage, $armour, 0, $fireOrder->id, $destroyed, "");
        $damageEntry->updated = true;
        $system->damage[] = $damageEntry;
        $this->onDamagedSystem($target, $system, $modifiedDamage, $armour, $gamedata);
        //print("damage: $damage armour: $armour destroyed: $destroyed \n");
        if ($damage-$armour > $systemHealth){
            //print("overkilling!\n\n");
             $damage = $damage-$modifiedDamage;
             $overkillSystem = $this->getOverkillSystem($target, $shooter, $system, $pos, $fireOrder, $gamedata);
             if ($overkillSystem != null)
                $this->doDamage($target, $shooter, $overkillSystem, $damage, $fireOrder, $pos, $gamedata);
        }
    
    
        
        
    }
    
    protected function onDamagedSystem($ship, $system, $damage, $armour, $gamedata){
        return;
    }
}
