window.weaponManager = {

    onModeClicked: function(e)
    {
        e.stopPropagation();
        var shipwindow = $(".shipwindow").has($(this));
        var systemwindow = $(".system").has($(this));
        var ship = gamedata.getShip(shipwindow.data("ship"));
        var system = shipManager.systems.getSystem(ship, systemwindow.data("id"));
        
        if (!system)
            return;
        
        if (gamedata.gamephase != 3 && !system.ballistic)
            return;
            
        if (gamedata.gamephase != 1 && system.ballistic)
            return;
        
        if (weaponManager.hasFiringOrder(ship, system))
            return;
        
        if (gamedata.isMyShip(ship)){
            var mode = system.firingMode+1;
            if (system.firingModes[mode]){
                system.firingMode = mode;
            }else{
                system.firingMode = 1;
            }
            
            weaponManager.unSelectWeapon(ship, system);
  
            
            shipWindowManager.setDataForSystem(ship, system);
        }
    },
    
    onHoldfireClicked: function(e){
        e.stopPropagation();
        var shipwindow = $(".shipwindow").has($(this));
        var systemwindow = $(".system").has($(this));
        var ship = gamedata.getShip(shipwindow.data("ship"));
        var system = shipManager.systems.getSystem(ship, systemwindow.data("id"));
        
        if (gamedata.gamephase != 3 && !system.ballistic)
            return;
            
        if (gamedata.gamephase != 1 && system.ballistic)
            return;
        
        if (ship.userid == gamedata.thisplayer){
            weaponManager.cancelFire(ship, system);
            
        }
        
    },
    
    cancelFire: function(ship, system){
		weaponManager.removeFiringOrder(ship, system);
		ballistics.updateList();
        shipWindowManager.setDataForSystem(ship, system);
	},    
    
    mouseoverTimer: null,
    mouseOutTimer: null,
    mouseoverSystem: null,
    
    onWeaponMouseover: function(e){
        
        if (weaponManager.mouseOutTimer != null){
            clearTimeout(weaponManager.mouseOutTimer); 
            weaponManager.mouseOutTimer = null;
        }
        
        if (weaponManager.mouseoverTimer != null)
            return;

        weaponManager.mouseoverSystem = $(this);
        weaponManager.mouseoverTimer = setTimeout(weaponManager.doWeaponMouseOver, 150);
    },
    
    onWeaponMouseOut: function(e){
        if (weaponManager.mouseoverTimer != null){
            clearTimeout(weaponManager.mouseoverTimer); 
            weaponManager.mouseoverTimer = null;
        }
        
        weaponManager.mouseOutTimer = setTimeout(weaponManager.doWeaponMouseout, 50);
    },
    
    doWeaponMouseOver: function(e){
        if (weaponManager.mouseoverTimer != null){
            clearTimeout(weaponManager.mouseoverTimer); 
            weaponManager.mouseoverTimer = null;
        }
        
        systemInfo.hideSystemInfo();
        weaponManager.removeArcIndicators();

        var t = weaponManager.mouseoverSystem;
        
        var id = t.data("shipid");
               
        var ship = gamedata.getShip(id);
        var system = null;
        
        if (t.hasClass("fightersystem")){
			system = shipManager.systems.getFighterSystem(ship, t.data("fighterid"), t.data("id"));
		}else{
			system = shipManager.systems.getSystem(ship, t.data("id"));
		}
        
    
        weaponManager.addArcIndicators(ship, system);
        systemInfo.showSystemInfo(t, system, ship);
        drawEntities();
    },
    
    doWeaponMouseout: function(){
        if (weaponManager.mouseOutTimer != null){
            clearTimeout(weaponManager.mouseOutTimer); 
            weaponManager.mouseOutTimer = null;
        }
        
        systemInfo.hideSystemInfo();
        
        weaponManager.mouseoverSystem = null;
        
        weaponManager.removeArcIndicators();
        drawEntities();
        
    },
    
    unSelectWeapon: function(ship, weapon){
    
        for(var i = gamedata.selectedSystems.length-1; i >= 0; i--){  
            if(gamedata.selectedSystems[i] == weapon){              
                gamedata.selectedSystems.splice(i,1);
                
            }
        }
        
        shipWindowManager.setDataForSystem(ship, weapon);

    },

    checkConflictingFireOrder: function(ship, weapon, alert){

        var p = ship;
        if (ship.flight){
            p = shipManager.systems.getFighterBySystem(ship, weapon.id);
        }
        
        for (var i in p.systems){
            var system = p.systems[i];
            if (system.id == weapon.id)
                continue;

        if (weaponManager.hasFiringOrder(ship, system)){
                if (weapon.exclusive){
                    if (alert)
                        confirm.error("You cannot fire another weapon at the same time as " +weapon.displayName + ".");
                    return true;
                }
                
                if (system.exclusive){
                    if (alert)
                        confirm.error("You cannot fire another weapon at the same time as " +system.displayName + ".");
                    return true;
                }
            }
                
        }
        
        return false;
     
    },
    
    selectWeapon: function(ship, weapon){
        
        if (weaponManager.checkConflictingFireOrder(ship, weapon, alert)){
            return;
        }
         
        if (!weaponManager.isLoaded(weapon))
            return;
    
        gamedata.selectedSystems.push(weapon);
        shipWindowManager.setDataForSystem(ship, weapon);
        
    },
    
    isSelectedWeapon: function(weapon){
        if ($.inArray(weapon, gamedata.selectedSystems) >= 0)
            return true;
            
        return false;
    },
    
    targetingShipTooltip: function(ship, e, calledid){
        //e.find(".shipname").html(ship.name);
        var selectedShip = gamedata.getSelectedShip();
        var f = $(".targeting", e);
        f.html("");
        for (var i in gamedata.selectedSystems){
            var weapon = gamedata.selectedSystems[i];
            
            if (weaponManager.isOnWeaponArc(selectedShip, ship, weapon)){
                if(weaponManager.checkIsInRange(selectedShip, ship, weapon))
                {
                    $('<div><span class="weapon">'+weapon.displayName+':</span><span class="hitchange"> '+weaponManager.calculateHitChange(selectedShip, ship, weapon, calledid)+'%</span></div>').appendTo(f);
                }
                else
                {
                    $('<div><span class="weapon">'+weapon.displayName+':</span><span class="hitchange"> NOT IN RANGE</span></div>').appendTo(f);
                }
            }else{
                $('<div><span class="weapon">'+weapon.displayName+':</span><span class="notInArc"> NOT IN ARC </span></div>').appendTo(f);
            }
        }        
    },
    
    canCalledshot: function(target, system){
		var shooter = gamedata.getSelectedShip();
        
        if (!shooter)
            return false;
        
		var loc = weaponManager.getShipHittingSide(shooter, target);
		
		if (target.flight)
			return false;
		
		if (system.location == loc || (system.location == 0 && (system.weapon || (system.name == "thruster") && system.direction == loc))){

			return true;
		}
	
		return false;
		
	},
    
    isPosOnWeaponArc: function(shooter, position, weapon){

        var shooterFacing = (shipManager.getShipHeadingAngle(shooter));
        var targetCompassHeading = mathlib.getCompassHeadingOfPosition(shooter, position);
        
        var arcs = shipManager.systems.getArcs(shooter, weapon);
        arcs.start = mathlib.addToDirection(arcs.start, shooterFacing);
        arcs.end = mathlib.addToDirection(arcs.end, shooterFacing);
        
        //console.log("shooterFacing: " + shooterFacing + " targetCompassHeading: " +targetCompassHeading);
        
        return (mathlib.isInArc(targetCompassHeading, arcs.start, arcs.end));
        
    
    },
    
    isOnWeaponArc: function(shooter, target, weapon){

        var shooterFacing = (shipManager.getShipHeadingAngle(shooter));
        var targetCompassHeading = mathlib.getCompassHeadingOfShip(shooter, target);
        
        var arcs = shipManager.systems.getArcs(shooter, weapon);
        arcs.start = mathlib.addToDirection(arcs.start, shooterFacing);
        arcs.end = mathlib.addToDirection(arcs.end, shooterFacing);
        var oPos = shipManager.getShipPosition(shooter);
        var tPos = shipManager.getShipPosition(target);
        
        if (weapon.ballistic && oPos.x == tPos.x && oPos.y == tPos.y)
            return true;
        
        //console.log("shooterFacing: " + shooterFacing + " targetCompassHeading: " +targetCompassHeading);
        
        return (mathlib.isInArc(targetCompassHeading, arcs.start, arcs.end));
        
    
    },
    
    calculateRangePenalty: function(shooter, target, weapon){
        var sPos = shipManager.getShipPositionInWindowCo(shooter);
        var tPos = shipManager.getShipPositionInWindowCo(target);
        var dis = mathlib.getDistance(sPos, tPos);
        var rangePenalty = (weapon.rangePenalty/hexgrid.hexWidth()*dis);
    
        return rangePenalty;
    },
    
    calculataBallisticHitChange: function(ball, calledid){
        if (!ball.targetid)
            return false;
        
        var shooter = gamedata.getShip(ball.shooterid);
        var weapon = shipManager.systems.getSystem(shooter, ball.weaponid);
        var target = gamedata.getShip(ball.targetid);
        
        var rangePenalty = weaponManager.calculateRangePenalty(shooter, target, weapon);
        
        var dew = ew.getDefensiveEW(target);
        if (target.flight)
			dew = shipManager.movement.getJinking(target);
        
        var bdew = ew.getSupportedBDEW(target);
        if (target.flight)
            bdew = 0;
        
        var sdew = ew.getSupportedDEW(target);
        var soew = ew.getSupportedOEW(shooter, target);
        var dist = ew.getDistruptionEW(shooter);
        
        var oew = ew.getTargetingEW(shooter, target);
        oew -= dist;
        
        var defence = weaponManager.getShipDefenceValuePos(ball.position, target);
        
        var firecontrol =  weaponManager.getFireControl(target, weapon);
        
        var intercept = weaponManager.getInterception(ball);
        
        var mod = 0;
        if (!shooter.flight)
			mod -= shipManager.criticals.hasCritical(shipManager.systems.getSystemByName(shooter, "CnC"), "PenaltyToHit");
       
		if (calledid)
			mod -= 8;
        
        var goal = (defence - dew - bdew - sdew - rangePenalty - intercept + oew + soew + firecontrol + mod);
        
        var change = Math.round((goal/20)*100);
        console.log("rangePenalty: " + rangePenalty + "intercept: " + intercept + " dew: " + dew + " oew: " + oew + " defence: " + defence + " firecontrol: " + firecontrol + " mod: " +mod+ " goal: " +goal);
        
        //if (change > 100)
        //  change = 100;
        return change;
        
    },
    
    getInterception: function(ball){
        
        var intercept = 0;
        
        for (var i in gamedata.ships){
            var ship = gamedata.ships[i];
            var fires = weaponManager.getAllFireOrders(ship);
            for (var a in fires){
                var fire = fires[a];
                if (fire.type == "intercept" && fire.targetid == ball.fireOrderId){
                    var weapon = shipManager.systems.getSystem(ship, fire.weaponid);
                    intercept += weapon.intercept;
                }
            }
            
            
        }
        
        return intercept;
        
    },
    
    calculateBaseHitChange: function(target, base, shooter){

        var dew = 0;
		
        //TODO: jincing ignored if range 0 and shooter not jinking!
		if (target.flight){
			dew = shipManager.movement.getJinking(target);
        }else{
            if (!shooter || !shooter.flight)
                dew = ew.getDefensiveEW(target);
        }
        var bdew = 0;
        var sdew = 0;
        if (!target.flight){
            bdew = ew.getSupportedBDEW(target);
            sdew = ew.getSupportedDEW(target);
        }
        
        //console.log("base: " + base + " dew: " + dew + " blanket: " + bdew + "supportDEW: " +  sdew);
        return base - dew - bdew - sdew;
        
        
    },
    
    calculateHitChange: function(shooter, target, weapon, calledid){
    
        var rangePenalty = weaponManager.calculateRangePenalty(shooter, target, weapon);
        var defence = weaponManager.getShipDefenceValue(shooter, target);
        //console.log("dis: " + dis + " disInHex: " + disInHex + " rangePenalty: " + rangePenalty);
        var baseDef = weaponManager.calculateBaseHitChange(target, defence, shooter);
        
        var soew = ew.getSupportedOEW(shooter, target);
        var dist = ew.getDistruptionEW(shooter);
        
        var oew = ew.getTargetingEW(shooter, target);
        oew -= dist;
		
        var mod = 0;
        
        if (shooter.flight){
			oew = shooter.offensivebonus;
            mod -= shipManager.movement.getJinking(shooter);
            
            if (shipManager.movement.hasCombatPivoted(shooter))
                mod--;
        }
        else
        {
            if (weapon.piercing && weapon.firingMode == 2)
                mod -= 4;

            if (shipManager.movement.hasRolled(shooter)){
                console.log("rolled");
                mod -= 3;
            }

            if (shipManager.movement.hasPivotedForShooting(shooter)){
                console.log("pivoting");
                mod -= 3;
            }
            mod -= shipManager.criticals.hasCritical(shipManager.systems.getSystemByName(shooter, "CnC"), "PenaltyToHit");
        }
        
        if (calledid)
			mod -= 8;
        
        var jammermod = 0;
        if (oew < 1){
            rangePenalty = rangePenalty*2;
         }else if (shooter.faction != target.faction){
            var jammer = shipManager.systems.getSystemByName(target, "jammer");
        
            if (jammer && !shipManager.power.isOffline(target, jammer))
                jammermod = rangePenalty*shipManager.systems.getOutput(target, jammer);
            
            if (target.flight){
                var jinking = shipManager.movement.getJinking(target);
                if ( jinking > jammermod){
                    jammermod = 0;
                }
                else{
                    jammermod = jammermod - jinking;
                }
            }
        }
            
        var firecontrol =  weaponManager.getFireControl(target, weapon);
            
        
        var goal = (baseDef - jammermod - rangePenalty + oew + soew + firecontrol + mod);
        
        var change = Math.round((goal/20)*100);
        console.log("rangePenalty: " + rangePenalty + "jammermod: "+jammermod+" baseDef: " + baseDef + " oew: " + oew + " soew: "+soew+" firecontrol: " + firecontrol + " mod: " +mod+ " goal: " +goal);
        
        if (change > 100)
            change = 100;
        return change;
        
    
    },
    
    getFireControl: function(target, weapon){
    
        if (target.shipSizeClass > 1){
            return weapon.fireControl[2];
        }
        if (target.shipSizeClass >= 0){
            return weapon.fireControl[1];
        }
        
        return weapon.fireControl[0];
        
    
    },
    
    getShipDefenceValuePos: function(position, target){
        var targetFacing = (shipManager.getShipHeadingAngle(target));
        var targetPos = shipManager.getShipPosition(target);
                
        var shooterCompassHeading = mathlib.getCompassHeadingOfPosition(target, position);
        
    
        
        //console.log("getShipDefenceValue targetFacing: " + targetFacing + " shooterCompassHeading: " +shooterCompassHeading);
        
        //console.log("ship degree: " +delta); 
        if (mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(330, targetFacing), mathlib.addToDirection(30, targetFacing) )){
            //console.log("hitting front 1");
            return target.forwardDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(150, targetFacing), mathlib.addToDirection(210, targetFacing) )){
            //console.log("hitting rear 2");
            return target.forwardDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(210, targetFacing), mathlib.addToDirection(330, targetFacing) )){
            //console.log("hitting port 3");
            return target.sideDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(30, targetFacing), mathlib.addToDirection(150, targetFacing) )){
            //console.log("hitting starboard 4");
            return target.sideDefense;
        }
            
        return target.sideDefense;
        
    },
    
    getShipHittingSide: function(shooter, target){
        var targetFacing = (shipManager.getShipHeadingAngle(target));
        var shooterCompassHeading = mathlib.getCompassHeadingOfShip(target,shooter);
        
    
        
        //console.log("getShipDefenceValue targetFacing: " + targetFacing + " shooterCompassHeading: " +shooterCompassHeading);
        
        //console.log("ship degree: " +delta); 
        if (mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(330, targetFacing), mathlib.addToDirection(30, targetFacing) )){
            return 1;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(150, targetFacing), mathlib.addToDirection(210, targetFacing) )){
            return 2;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(210, targetFacing), mathlib.addToDirection(330, targetFacing) )){
            return 3;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(30, targetFacing), mathlib.addToDirection(150, targetFacing) )){
            return 4;
        }
            
        return 0;
        
    },
    
    getShipDefenceValue: function(shooter, target){
        var targetFacing = (shipManager.getShipHeadingAngle(target));
        var shooterCompassHeading = mathlib.getCompassHeadingOfShip(target,shooter);
        
    
        
        //console.log("getShipDefenceValue targetFacing: " + targetFacing + " shooterCompassHeading: " +shooterCompassHeading);
        
        //console.log("ship degree: " +delta); 
        if (mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(330, targetFacing), mathlib.addToDirection(30, targetFacing) )){
            //console.log("hitting front 1");
            return target.forwardDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(150, targetFacing), mathlib.addToDirection(210, targetFacing) )){
            //console.log("hitting rear 2");
            return target.forwardDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(210, targetFacing), mathlib.addToDirection(330, targetFacing) )){
            //console.log("hitting port 3");
            return target.sideDefense;
        }else if ( mathlib.isInArc(shooterCompassHeading, mathlib.addToDirection(30, targetFacing), mathlib.addToDirection(150, targetFacing) )){
            //console.log("hitting starboard 4");
            return target.sideDefense;
        }
            
        return target.sideDefense;
        
    },
    /*
    canIntercept: function(ball){
        var selectedShip = gamedata.getSelectedShip();
        if (shipManager.isDestroyed(selectedShip))
            return false;
            
        if (!ball.targetid || ball.targetid != selectedShip.id)
            return false;
            
        for (var i in gamedata.selectedSystems){
            var weapon = gamedata.selectedSystems[i];
            
            if (shipManager.systems.isDestroyed(selectedShip, weapon) || !weaponManager.isLoaded(weapon))
                continue;
            
            if (weaponManager.isPosOnWeaponArc(selectedShip, ball.position, weapon)){
                return true;
            }
        }
        
        return false;
    },
    */
    targetBallistic: function(ball){
         if (gamedata.gamephase != 3)
            return;
            
            
        var selectedShip = gamedata.getSelectedShip();
        if (shipManager.isDestroyed(selectedShip))
            return;
            
        if (!ball.targetid) 
            return;
            
        var target = gamedata.getShip(ball.targetid);
                    
        var toUnselect = Array();
        
        for (var i in gamedata.selectedSystems){
            var weapon = gamedata.selectedSystems[i];
            
            if (ball.targetid != selectedShip.id && !weapon.freeintercept )
                continue;
                
            if (ball.targetid != selectedShip.id && weapon.freeintercept){
                var ballpos = hexgrid.positionToPixel(ball.position);
                var targetpos = shipManager.getShipPositionInWindowCo(target);
                var selectedpos = shipManager.getShipPositionInWindowCo(selectedShip);
                if (mathlib.getDistanceHex(ballpos, targetpos) <= mathlib.getDistanceHex(ballpos, selectedpos) || mathlib.getDistanceHex(targetpos, selectedpos) >3)
                    continue;
            }
            if (shipManager.systems.isDestroyed(selectedShip, weapon) || !weaponManager.isLoaded(weapon))
                continue;
            if (weapon.intercept == 0)
                continue;
                
            var type = 'intercept';
            
                            
            if (weaponManager.isPosOnWeaponArc(selectedShip, ball.position, weapon)){
                weaponManager.removeFiringOrder(selectedShip, weapon);
                for (var s=0;s<weapon.guns;s++){
                    weapon.fireOrders.push({id:null,type:type, shooterid:selectedShip.id, targetid:ball.fireOrderId, weaponid:weapon.id, calledid:-1, turn:gamedata.turn, firingMode:weapon.firingMode, shots:weapon.defaultShots, x:"null", y:"null"});
                }
                toUnselect.push(weapon);
            }
        }
        
        for (var i in toUnselect){
            weaponManager.unSelectWeapon(selectedShip, toUnselect[i]);
        }
        
        gamedata.shipStatusChanged(selectedShip);
        
    },
    
    //system is for called shot! 
    targetShip: function(ship, system){
    
        var selectedShip = gamedata.getSelectedShip();
        if (shipManager.isDestroyed(selectedShip))
            return;
        
        var toUnselect = Array();
        for (var i in gamedata.selectedSystems){
            var weapon = gamedata.selectedSystems[i];
            
            if (shipManager.systems.isDestroyed(selectedShip, weapon) || !weaponManager.isLoaded(weapon))
                continue;
        
            
            if (weapon.ballistic && gamedata.gamephase != 1){
                continue;
            }
            if (!weapon.ballistic && gamedata.gamephase != 3){
                continue;
            }
            
            if (weapon.ballistic && system)
				continue;
            
            if (weaponManager.checkConflictingFireOrder(selectedShip, weapon)){
                continue;
            }
            
            var type = 'normal';
            if (weapon.ballistic){
                type = 'ballistic';
            }
                
            
            
            
            if (weaponManager.isOnWeaponArc(selectedShip, ship, weapon)){
                if (weaponManager.checkIsInRange(selectedShip, ship, weapon)){
                    weaponManager.removeFiringOrder(selectedShip, weapon);
                    for (var s=0;s<weapon.guns;s++){
                        
                        var fireid = selectedShip.id+"_"+weapon.id +"_"+(weapon.fireOrders.length+1);
                        
                        var	calledid = -1;
                        if (system)
							calledid = system.id;
							
                        var fire = {
                            id:fireid,
                            type:type,
                            shooterid:selectedShip.id,
                            targetid:ship.id,
                            weaponid:weapon.id,
                            calledid:calledid,
                            turn:gamedata.turn,
                            firingMode:weapon.firingMode,
                            shots:weapon.defaultShots,
                            x:"null",
                            y:"null"
                        };
                        weapon.fireOrders.push(fire);            
                        
                    }
                    if (weapon.ballistic){
                        gamedata.ballistics.push({id:(gamedata.ballistics.length), fireid:fireid, position:shipManager.getShipPosition(selectedShip),
                        facing:shipManager.movement.getLastCommitedMove(selectedShip).facing,
                        targetposition:{x:null, y:null},
                        targetid:ship.id,
                        shooterid:selectedShip.id,
                        weaponid:weapon.id,
                        shots:fire.shots});
                        
                        ballistics.calculateBallisticLocations();
                        ballistics.calculateDrawBallistics();                        
                        drawEntities();
                        //$id, $fireid, $position, $facing, $targetpos, $targetid, $shooterid, $weaponid, $shots
                    }
                    toUnselect.push(weapon);
                }
            }
        }
        
        for (var i in toUnselect){
            weaponManager.unSelectWeapon(selectedShip, toUnselect[i]);
        }
        
        gamedata.shipStatusChanged(selectedShip);
    
    },
    
    checkIsInRange: function(shooter, target, weapon){
        
        var range = weapon.range;
        
        if (range === 0)
            return true;
        
        var shooterPos = shipManager.getShipPositionInWindowCo(shooter);
        var targetPos = shipManager.getShipPositionInWindowCo(target)
        
        var jammer = shipManager.systems.getSystemByName(target, "jammer");
        
        if (jammer
            //&& !shipManager.power.isOffline(target, jammer)
            //&& !shipManager.systems.isDestroyed(target, jammer)
        )
        {
            range = range / (shipManager.systems.getOutput(target, jammer)+1);
        }
        
        return (mathlib.getDistanceHex(shooterPos, targetPos) <= range);
    },
    
    targetHex: function(hexpos){
    
        var selectedShip = gamedata.getSelectedShip();
        if (shipManager.isDestroyed(selectedShip))
            return;
        
        
            
        var toUnselect = Array();
        for (var i in gamedata.selectedSystems){
            var weapon = gamedata.selectedSystems[i];
            
            if (shipManager.systems.isDestroyed(selectedShip, weapon) || !weaponManager.isLoaded(weapon))
                continue;
        
            
            if (weapon.ballistic && gamedata.gamephase != 1){
                continue;
            }
            if (!weapon.ballistic && gamedata.gamephase != 3){
                continue;
            }
            
            if (!weapon.hextarget)
                continue;
            
            if (weaponManager.checkConflictingFireOrder(selectedShip, weapon)){
                continue;
            }
            
            var type = 'normal';
            if (weapon.ballistic){
                type = 'ballistic';
            }
                        
            
            if (weaponManager.isPosOnWeaponArc(selectedShip, hexpos, weapon)){
                if (weapon.range == 0 || (mathlib.getDistanceHex(shipManager.getShipPositionInWindowCo(selectedShip), hexgrid.positionToPixel(hexpos))<=weapon.range)){
                    weaponManager.removeFiringOrder(selectedShip, weapon);
                    for (var s=0;s<weapon.guns;s++){
                        
                        var fireid = selectedShip.id+"_"+weapon.id +"_"+(weapon.fireOrders.length+1);
                        var fire = {id:fireid,type:type, shooterid:selectedShip.id, targetid:-1, weaponid:weapon.id, calledid:-1, turn:gamedata.turn, firingMode:weapon.firingMode, shots:weapon.defaultShots, x:hexpos.x, y:hexpos.y};
                        weapon.fireOrders.push(fire);
                        
                    }
                    if (weapon.ballistic){
                        gamedata.ballistics.push({id:(gamedata.ballistics.length), fireid:fireid, position:shipManager.getShipPosition(selectedShip),
                        facing:shipManager.movement.getLastCommitedMove(selectedShip).facing,
                        targetposition:hexpos,
                        targetid:-1,
                        shooterid:selectedShip.id,
                        weaponid:weapon.id,
                        shots:fire.shots});
                        
                        ballistics.calculateBallisticLocations();
                        ballistics.calculateDrawBallistics();                        
                        drawEntities();
                        //$id, $fireid, $position, $facing, $targetpos, $targetid, $shooterid, $weaponid, $shots
                    }
                    
                    toUnselect.push(weapon);
                }
            }
        }
        
        for (var i in toUnselect){
            weaponManager.unSelectWeapon(selectedShip, toUnselect[i]);
        }
        
        gamedata.shipStatusChanged(selectedShip);
    
    },
       
    
    removeFiringOrder: function(ship, system){
       
        for(var i = system.fireOrders.length-1; i >= 0; i--){  
            if(system.fireOrders[i].weaponid == system.id){              
                  
                for(var a = gamedata.ballistics.length-1; a >= 0; a--){
                    if (gamedata.ballistics[a].fireid == system.fireOrders[i].id && gamedata.ballistics[a].shooterid == ship.id){
                        var id = gamedata.ballistics[a].id;
                        
                        $('#ballistic_launch_canvas_'+id).remove();
                        $('#ballistic_target_canvas_'+id).remove();
                        $('.ballistic_'+id).remove();
                        gamedata.ballistics.splice(a,1);  
                    }
                }  
                system.fireOrders.splice(i,1);               
            }
        }
        ballistics.calculateBallisticLocations();
        ballistics.calculateDrawBallistics();                        
        drawEntities();
        
    
    },
    
    hasFiringOrder: function(ship, system){
        
        for (var i in system.fireOrders){
            var fire = system.fireOrders[i];
            if (fire.weaponid == system.id && fire.turn == gamedata.turn && !fire.rolled){
                if ((gamedata.gamephase == 1 && system.ballistic) || (gamedata.gamephase == 3 && !system.ballistic)){
                    return true;
                }
            }
                
        }
        return false;
    
    },
    
    shipHasFiringOrder: function(ship)
    {
      //TODO:implement  
    },
    
    canCombatTurn: function(ship){
        
        var fires = weaponManager.getAllFireOrders(ship);
        for (var i in fires){
            var fire = fires[i];
            var weapon = shipManager.systems.getSystem(ship, fire.weaponid)
            if (fire.turn == gamedata.turn && !fire.rolled && !weapon.ballistic){
                return false;
            }
                
        }
        return true;
    
    },
    
    getFiringOrder: function(ship, system){
        
        var fires = weaponManager.getAllFireOrders(ship);
        for (var i in fires){
            var fire = fires[i];
            if (fire.weaponid == system.id && fire.turn == gamedata.turn && !fire.rolled)
                return fire;
        }
        
        return false;
    
    },
    
    getAllFireOrders: function(ship)
    {
        var fires = new Array();
        for (var i in ship.systems)
        {
            if (ship.flight){
                var fighter = ship.systems[i];
                for (var a in fighter.systems){
                    var system = fighter.systems[a];
                    var sysFires = weaponManager.getAllFireOrdersFromSystem(system);
                    if (sysFires)
                        fires = fires.concat(sysFires);
                }
                
            }else{
                var system = ship.systems[i];
                var sysFires = weaponManager.getAllFireOrdersFromSystem(system);
                if (sysFires)
                    fires = fires.concat(sysFires);
            }
            
        }
        return fires;
    },
    
    getAllFireOrdersFromSystem: function(system){
        if (! system.weapon)
            return;
        var fires = system.fireOrders;
        if (system.dualWeapon){
            for (var i in system.weapons){
                fires = fires.concat(system.weapons[i].fireOrders);
            }
        }
        return fires;
        
    },
    
    getInterceptingFiringOrders: function(id){
        var intercepts = Array();
        
        for (var a in gamedata.ships){
            var ship = gamedata.ships[a];
            var fires = weaponManager.getAllFireOrders(ship);
            for (var i in fires){
                var fire = fires[i];
                if (fire.targetid == id && fire.turn == gamedata.turn && fire.type == "intercept")
                    intercepts.push(fire);
            }
        }
        
        return intercepts;
    
    },
    
    changeShots: function(ship, system, mod){
        var fires = weaponManager.getAllFireOrders(ship);
        for (var i in fires){
            var fire = fires[i];
            if (fire.weaponid == system.id && fire.turn == gamedata.turn && !fire.rolled){
                if ((gamedata.gamephase == 1 && system.ballistic) || (gamedata.gamephase == 3 && !system.ballistic))
                    fire.shots += mod;
            }
                
        }
        
        shipWindowManager.setDataForSystem(ship, system);
    },
    
    getDamagesCausedBy: function(damages, fire){
        
        for (var i in gamedata.ships){
            var ship = gamedata.ships[i];
            var list = Array();
            
            for (var a in ship.systems){
                var system = ship.systems[a];
                for (var b in system.damage){
                    var d = system.damage[b];
                    if (d.fireorderid == fire.id){
                        list.push(d);
                    }
                        
                }
            
            }
            
            if (list.length>0){
                //console.log(list);
                var found = false;
                for (var a in damages){
                    var entry = damages[a];
                    if (entry.ship.id == ship.id){
                        found = true;
                        entry.damages = entry.damages.concat(list);
                    }
                }
                if (!found)
                    damages.push({ship:ship, damages:list});
            }
            
        }
        
        return damages;
        
      
        
    },
    
    removeArcIndicators: function(){
     
        for(var i = EWindicators.indicators.length-1; i >= 0; i--){  
            if(EWindicators.indicators[i].type == "Arcs"){              
                EWindicators.indicators.splice(i,1);                 
            }
        }

        
    },
    
    addArcIndicators: function(ship, weapon){
        weapon = shipManager.systems.initializeSystem(weapon);
        weaponManager.removeArcIndicators(ship);
        var ind = weaponManager.makeWeaponArcindicator(ship, weapon);
        
        if (ind)
            EWindicators.indicators.push(ind);
      
    },
    
    makeWeaponArcindicator: function(ship, weapon){
        var effect = {};
        
        var a = shipManager.getShipHeadingAngle(ship);
        var arcs = shipManager.systems.getArcs(ship, weapon);
        var dis;
        if (weapon.rangePenalty == 0){
            dis =  hexgrid.hexWidth()*weapon.range;
        }else{
            dis =  20*hexgrid.hexWidth()/weapon.rangePenalty;
        }
        
        arcs.start = mathlib.addToDirection(arcs.start, a);
        arcs.end = mathlib.addToDirection(arcs.end, a);
        //console.log("start: " + arcs.start + " end: " +arcs.end);
        effect.ship = ship;
        effect.type = "Arcs"
        effect.arcs = arcs;
        effect.dis = dis;
        effect.draw = function(self){
            var arcs = self.arcs;
            var canvas = EWindicators.getEwCanvas();
            
            
            
            var pos = shipManager.getShipPositionForDrawing(self.ship);
            canvas.strokeStyle = "rgba(20,80,128,0.2)";
            canvas.fillStyle = "rgba(20,80,128,0.2)";
            if (arcs.start == arcs.end){
                graphics.drawCircleAndFill(canvas, pos.x, pos.y, self.dis, 1);
            }else{
            
                
                var p1 = mathlib.getPointInDirection(self.dis, arcs.start, pos.x, pos.y);
                var p2 = mathlib.getPointInDirection(self.dis, arcs.end, pos.x, pos.y);
        
                
                graphics.drawCone(canvas, pos, p1, p2, arcs, 1)
            }
            
        };
        
        return effect;
    
    },
    
    
    isLoaded: function(weapon){
        return (weapon.loadingtime <= weapon.turnsloaded
            || weapon.loadingtime <= weapon.overloadturns );
    },
    
    getFireOrderById: function(id){
        
        for (var i in gamedata.ships){
            for (var a in gamedata.ships[i].fireOrders){
                var fire = gamedata.ships[i].fireOrders[a];
                if (fire.id == id)
                    return fire;
            }
            
            
        }
        
        return false;
        
    },
    
    getFiringWeapon: function(weapon, fire){
        //console.dir(weapon);
        if (weapon.dualWeapon){
            return weapon.weapons[fire.firingMode];
        }
        
        return weapon;
    }
    
}





