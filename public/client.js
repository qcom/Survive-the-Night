//$(function(){
	var socket		= io.connect("http://80.162.44.115:1337"),
		//socket		= io.connect("http://stn.jit.su:80"),
		sprite		= new Image();
		sprite.src	= "spritesheet.png";
	socket.on("connect", function(){
//		sprite.onload = function(){
			var canvas 		= $("#board")[0];
				ctx 		= canvas.getContext("2d"),
				speed 		= 2,
				size		= 7, // Radius; 7 => 14
				player 		= {
					"x"		: rand(0, 500),
					"y"		: rand(50, 500),
					"hp"	: 1,
					"id"	: Math.round(Math.random()*$.now()),
					"color"	: { "r": rand(100, 255), "g": rand(100, 255), "b": rand(100, 255) },
					"deaths": 0},
				movement 	= {
					"left"	: false,
					"up"	: false,
					"right" : false,
					"down"	: false},
				typing		= false,
				clients 	= {},
				zombies 	= [],
				medicKits	= {},
				imDead		= false,
				texture		= {y: 42, x: 2*14};

			socket.on("message", function(data){ player.id = data; socket.emit("newPlayer", player) });
			socket.on("playerMovement", function(data){ clients[data.id] = data });

			function rand(min, max){
				var num = Math.floor(Math.random()*(max - min + 1)) + min;
				while(num < min){
					num = Math.floor(Math.random()*(max - min + 1)) + min;
				}
				return num;
			}

			function handleChat(args){
				if(args.id == player.id){ var c = player.color; }
				else{ var c = clients[args.id].color; }
				$("<li><b style='color: rgb("+c.r+","+c.g+","+c.b+")'>"+args.id+"</b>: "+args.msg.substr(0,80)+"</li>").prependTo("#chat ul");
			}

			function handleKeys(){
				document.onkeydown = function(e){
					var kc = e.keyCode;
					if((kc == 65 || kc == 37) && !typing){ movement.left = true };
					if((kc == 87 || kc == 38) && !typing){ movement.up = true };
					if((kc == 68 || kc == 39) && !typing){ movement.right = true };
					if((kc == 83 || kc == 40) && !typing){ movement.down = true };
					if((kc == 13) && !typing){ $("#textbox").focus() };
				}
				document.onkeyup = function(e){
					var kc = e.keyCode;
					if((kc == 65 || kc == 37) && !typing){ movement.left = false };
					if((kc == 87 || kc == 38) && !typing){ movement.up = false };
					if((kc == 68 || kc == 39) && !typing){ movement.right = false };
					if((kc == 83 || kc == 40) && !typing){ movement.down = false };
				}
			}

			function movePlayer(){
				if(player.hp > 0){
					if(movement.left 	&& player.x >= 008){ player.x = player.x - speed; socket.emit("playerMovement", player); };
					if(movement.up 		&& player.y >= 008){ player.y = player.y - speed; socket.emit("playerMovement", player); };
					if(movement.right 	&& player.x <= 492){ player.x = player.x + speed; socket.emit("playerMovement", player); };
					if(movement.down 	&& player.y <= 492){ player.y = player.y + speed; socket.emit("playerMovement", player); };
				}

				if(player.y < 43 && player.hp < 1){
					player.hp = player.hp + 0.005;
				}

				ctx.fillStyle = "rgba("+player.color.r+", "+player.color.g+", "+player.color.b+", "+(player.hp <= 0 ? 0 : player.hp)+")";
				//ctx.fillStyle = "rgb("+player.color.r+", "+player.color.g+", "+player.color.b+")";
				ctx.beginPath();
				ctx.arc(player.x, player.y, size, 0, Math.PI*2);
				ctx.closePath();
				ctx.fill();

				if(player.hp <= 0){
					ctx.drawImage(sprite, 14, 0, 14, 14, (player.x - size), (player.y - size), 14, 14);
				}else{
					ctx.drawImage(sprite, 0, 0, 14, 14, (player.x - size), (player.y - size), 14, 14);
				}
			}

			function moveZombies(){
				for(var key in zombies){
					var z = zombies[key];
					ctx.drawImage(sprite, 0, 14, 14, 14, (z.x - size), (z.y - size), 14, 14);
				}
			}

			function handleLife(){
				for(var key in zombies){
					var z = zombies[key];
					if( (player.x <= (z.x + size) && player.x >= (z.x - size)) && 
						(player.y <= (z.y + size) && player.y >= (z.y - size)) &&
						player.hp >= 0){
						player.hp = player.hp - .1;
						imDead	= false;
					}else if(player.hp <= 0 && !imDead){
						player.deaths++;
						socket.emit("imDead", player);
						imDead = true;
					}
				}
			}

			function handleClients(){
				for(var key in clients){
					var c = clients[key];

					if(c.y < 43){
						c.hp = c.hp + 0.005;
					}

					ctx.fillStyle = "rgba("+c.color.r+", "+c.color.g+", "+c.color.b+", "+(c.hp <= 0 ? 0 : c.hp)+")";
					//ctx.fillStyle = "rgb("+c.color.r+", "+c.color.g+", "+c.color.b+")";
					ctx.beginPath();
					ctx.arc(c.x, c.y, size, 0, Math.PI*2);
					ctx.closePath();
					ctx.fill();
					if(c.hp <= 0){
						ctx.drawImage(sprite, 0, 28, 14, 14, (c.x - size), (c.y - size), 14, 14);
					}else{
						ctx.drawImage(sprite, 0, 0, 14, 14, (c.x - size), (c.y - size), 14, 14);
					}
				}
			}

			function handleKits(){
				for(var key in medicKits){
					var k = medicKits[key];
					ctx.drawImage(sprite, 14, 28, 14, 14, (k.x - size), (k.y - size), 14, 14);

					if( (k.x <= (player.x + size) && k.x >= (player.x - size)) && 
						(k.y <= (player.y + size) && k.y >= (player.y - size))){
						player.hp = 1;
						socket.emit("kitTaken", k.id);
					}
				}
			}

			function handleStats(){
				var users = [[player.deaths, player.id]];
				for(var key in clients){
					users.push([clients[key].deaths, clients[key].id]);
				}

				users.sort();
				$("#users").html("");
				for(var i=0;i<users.length;i++){
					var user = clients[users[i][1]];
					if(users[i][1] == player.id){
						user = player;
					}
					
					$("<li "+(user.hp <= 0 ? "class='dead'" : '')+" \n\
						style='color: rgb("+user.color.r+", "+user.color.g+", "+user.color.b+")'>\n\
						"+user.id+"</li>").appendTo("#users");
				}
				users = undefined;
			}

			function generatePattern(sprite, x, y){
				var canvas			= document.createElement("canvas");
					canvas.width	= 14;
					canvas.height	= 14;
				var ctx = canvas.getContext("2d");
					ctx.drawImage(sprite, x, y, 14, 14, 0, 0, 14, 14);
				return canvas;
			}

			function loop(){
				ctx.clearRect(0, 0, 500, 500);
				var ptrn = generatePattern(sprite, texture.x, texture.y);
				ctx.fillStyle = ctx.createPattern(ptrn, "repeat");
				ctx.fillRect(0, 0, 500, 500);
				ctx.strokeStyle = "#000";

				ctx.fillStyle = "darkblue";
				ctx.fillRect(0, 0, 500, 50);
				ctx.fillStyle = "white";
				ctx.font = "bold 30px sans-serif";
				ctx.textBaseline = "top";
				ctx.fillText("SafeZone", Math.round(250 - ctx.measureText("SafeZone").width/2), 7);

				handleKeys();
				handleLife();
				handleKits();
				movePlayer();
				handleClients();
				handleStats();
				moveZombies();
			}
			setInterval(loop, 1000/30);

			socket.on("zombie", function(data){
				zombies = data;
			});
			socket.on("medic", function(data){
				medicKits = data;
			});
			socket.on("clientUpdate", function(data){
				(player.id != data.id ? clients[data.id] = data : "");
			});
			socket.on("afk", function(data){ // I see dead people too!
				if(player.id == data[player.id].id && data[player.id].follow == false){
					player.x 	= data[player.id].x;
					player.y 	= data[player.id].y;
				}else if(player.id != data[player.id].id){
					clients[data.id] = data;
				}
				handleClients();
			});
			socket.on("clientLeft", function(data){
				delete clients[data];
			});

			socket.on("chitchat", function(data){
				handleChat(data);
			});
			$("#textbox").focusin(function(){
				typing = true;
			}).keyup(function(e){
				if(e.keyCode == 13 && $(this).val().length > 1){ 
					socket.emit("chitchat", {id: player.id, msg: $(this).val()});
					handleChat({id: player.id, msg: $(this).val()});
					$(this).val("");
					$(this).blur();
				}else if(e.keyCode == 27){
					$(this).val("");
					$(this).blur();
				}
			}).focusout(function(){
				typing = false;
			})
//		}
	});
//})