window.shipSelectList = {


	haveToShowList: function(ship, event){
	
		var list = shipManager.getShipsInSameHex(ship);
		
		if (list.length > 1)
			return true;
        
        if (event && event.which === 1 && gamedata.gamephase == 1){
            var selectedShip = gamedata.getSelectedShip();
            if (shipManager.isElint(selectedShip)){
                if (selectedShip != ship && ew.checkInELINTDistance(selectedShip, ship)){
                    return true;
                }
                if (!gamedata.isMyShip(ship) && ew.checkInELINTDistance(selectedShip, ship, 30)){
                    return true;
                }
            }
        }
		return false;
		
	
	},
	
	showList: function(ship){
		
		$(".shipSelectList").remove();
		
		var list = shipManager.getShipsInSameHex(ship);
		var pos = shipManager.getShipPositionForDrawing(ship);
		var selectedShip = gamedata.getSelectedShip();
        
       
       
        
		var e = $('<div class="shipSelectList"></div>');
		for (var i in list){
			var listship = list[i];
			var fac = "ally";
			if (listship.userid != gamedata.thisplayer){
				fac = "enemy";
			}
			
			$('<div oncontextmenu="shipSelectList.onShipContextMenu(this);return false;" class="shiplistentry" data-id="'+listship.id+'"><span class="name '+fac+'">'+listship.name+'</span></div>').appendTo(e);
			
            if (gamedata.gamephase === 1 && selectedShip != listship && shipManager.isElint(selectedShip)){
                if (gamedata.isEnemy(selectedShip, listship)){
                    if (ew.checkInELINTDistance(selectedShip, listship, 50)){
                        $('<div oncontextmenu="shipSelectList.onShipContextMenu(this);return false;" class="shiplistentry action" data-action="DIST" data-id="'+listship.id+'"><span class="'+fac+'">Assign disruption EW</span></div>').appendTo(e);
                    }
                }else{
                    if (ew.checkInELINTDistance(selectedShip, listship, 30)){
                        $('<div oncontextmenu="shipSelectList.onShipContextMenu(this);return false;" class="shiplistentry action" data-action="SOEW" data-id="'+listship.id+'"><span class="'+fac+'">Assign support OEW</span></div>').appendTo(e);
                        $('<div oncontextmenu="shipSelectList.onShipContextMenu(this);return false;" class="shiplistentry action" data-action="SDEW" data-id="'+listship.id+'"><span class="'+fac+'">Assign support DEW</span></div>').appendTo(e);
                    }
                }
            }
		}
		
		var dis = 10 + (40*gamedata.zoom);
		
		if (dis > 60)
			dis = 60;
		
		e.css("left", (pos.x+dis) + "px").css("top", (pos.y - 50) +"px");
		
		e.appendTo("body");
		
		$('.shiplistentry',e).on('mouseover', shipClickable.shipclickableMouseOver);
		$('.shiplistentry',e).on('mouseout', shipClickable.shipclickableMouseOut);
		$('.shiplistentry',e).on('click', shipSelectList.onListClicked);
		
		e.show();
		
		
	
	},
	
	onListClicked: function(e){
        shipSelectList.remove();
        
		var id = $(this).data("id");
        var ship = gamedata.getShip(id);
		
		var action = $(this).data("action");
        if (!action){
            shipManager.doShipClick(ship);
		}else if (action == "SOEW"){
            ew.AssignOEW(ship, "SOEW");
        }else if (action == "SDEW"){
            ew.AssignOEW(ship, "SDEW");
        }else if (action == "DIST"){
            ew.AssignOEW(ship, "DIST");
        }
	
	},
	
	onShipContextMenu: function(e){
	
		var id = $(e).data("id");
        var ship = gamedata.getShip(id);
		
		
		shipManager.doShipContextMenu(ship);
	
	},
	
	remove: function(){
		shipClickable.shipclickableMouseOut();
		$(".shipSelectList").remove();
	}



}
