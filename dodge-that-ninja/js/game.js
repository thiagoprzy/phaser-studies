var game = new Phaser.Game(1280, 720, Phaser.AUTO, 'game', { preload: preload, create: create, update: update, render: render });

function preload() {

	//Load tilemap
	game.load.tilemap('tilemap', 'assets/tile.json', null, Phaser.Tilemap.TILED_JSON);
	
	//Load images
    game.load.spritesheet('star', 'assets/shuriken.png',60,60);
    game.load.image('enemy', 'assets/blank.png');
	//game.load.image('ship', 'assets/games/invaders/player.png');
	game.load.spritesheet('ninja', 'assets/ninja.png?v=1', 150, 200);
	game.load.spritesheet('shadow', 'assets/shadow.png?v=1', 150, 35);
	game.load.spritesheet('starShadow', 'assets/starShadow.png', 55, 12);
    game.load.image('background', 'assets/jpn_bg.png');
	game.load.image('ground', 'assets/ground.png');
	game.load.image('gameover', 'assets/gameover.png?v=1');

	 // Load sounds
    game.load.audio('jump1', 'assets/audio/jump1.mp3');
	game.load.audio('jump2', 'assets/audio/jump2.mp3');
	game.load.audio('jump3', 'assets/audio/jump3.mp3');
	game.load.audio('jump4', 'assets/audio/jump4.mp3');
    game.load.audio('ouch', 'assets/audio/ouch.mp3');
    game.load.audio('launch', 'assets/audio/launch.mp3');
	game.load.audio('spinning', 'assets/audio/spinning.mp3');
}

var map;
var layer;
var player;
var shadow;
var stars;
var item;
var itemNumber = -1;
var itemSprite;
var enemies;
var starTime = 0;
var hasArmor;
var hasForceField;
var hasAttack;
var jumpButton;
var jumpPreparation = null;
var jumping = false;
var tumble = null;
var buttonDown;
var background;
var gameover;
var score = 0;
var scoreString = '';
var scoreString2 = '';
var scoreText;
var enemyStar;
var enemyStarsShadow;
var firingTimer = 0;
var powerTimer = 0;
var stateText;
var stateText2;
var doubleJump = false;
var livingEnemies = [];
var tempRandom = 0;
var inaRow = 0;

var jumpSounds;
var seOuch;
var seLaunch;
var seSpin;

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);
	game.physics.arcade.gravity.y = 2000;
	game.physics.arcade.TILE_BIAS = 40;
	
	background = game.add.tileSprite(0, 0, 1280, 720, 'background');
	
	map = game.add.tilemap('tilemap'); // Preloaded tilemap
	map.addTilesetImage('ground'); // Preloaded tileset
	layer = map.createLayer('tile');
	layer.resizeWorld();
	map.setCollision([1]); 
	
	gameover = game.add.sprite(349, 307, 'gameover');
	gameover.visible = false;

    // The enemy's stars
    enemyStars = game.add.group();
    enemyStars.enableBody = true;
    enemyStars.physicsBodyType = Phaser.Physics.ARCADE;
    enemyStars.createMultiple(4, 'star');
    enemyStars.setAll('anchor.x', 0.5);
    enemyStars.setAll('anchor.y', 0.5);
    enemyStars.setAll('checkWorldBounds', true);
	
	// The enemy's stars' shadow
    enemyStarsShadow = game.add.group();
    enemyStarsShadow.enableBody = true;
    enemyStarsShadow.createMultiple(4, 'starShadow');
    enemyStarsShadow.setAll('anchor.x', 0.5);
    enemyStarsShadow.setAll('anchor.y', 0.5);
    enemyStarsShadow.setAll('checkWorldBounds', true);
	enemyStarsShadow.setAll('outOfBoundsKill', true);
	
	// The ninja's shadow
	shadow = game.add.sprite(30, 640, 'shadow');
	shadow.enableBody = false;
    shadow.animations.add('shadow1', [0], 7, false);
	shadow.animations.add('shadow2', [0,1,2], 20, false);
	shadow.animations.add('shadow3', [2,1,0], 20, false);
	shadow.play('shadow1');	
	
	// The ninja
	player = game.add.sprite(30, 410, 'ninja');
    game.physics.enable(player, Phaser.Physics.ARCADE);
	player.enableBody = true;
    player.body.collideWorldBounds = true;
    player.animations.add('ready', [0,1,2,1], 7, true);
	player.animations.add('prepareJump', [2,3], 20, false);
	player.animations.add('jump', [4,5,6], 7, false);
	player.animations.add('fall', [5,4,3,2], 20, false);
	player.body.setSize(72, 175, 52, 25);

    //  The stars' launchers
    enemies = game.add.group();
    enemies.enableBody = true;
    enemies.physicsBodyType = Phaser.Physics.ARCADE;

    createEnemies();

    //  The score
    scoreString = 'Score : ';
	scoreText2 = game.add.text(12, 12, scoreString + score, { font: '34px Arial', fill: '#cdbe35' });
    scoreText = game.add.text(10, 10, scoreString + score, { font: '34px Arial', fill: '#f2e438' });

    //  Game over text
	stateText2 = game.add.text(559, 423,' ', { font: '34px Arial', fill: '#cdbe35' });
    stateText = game.add.text(stateText2.x -2, stateText2.y -2,' ', { font: '34px Arial', fill: '#f2e438' });
	
    //  Jump button
    //jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    //jumpButton.onUp.add(function(){ buttonDown = false; },this);
	game.input.onTap.add(function(){ if (player.body.onFloor() || !doubleJump) buttonDown = true; },this);
	
	// Configure sound effects    
	jumpSounds = [ game.add.audio('jump1'), game.add.audio('jump2'), game.add.audio('jump3'), game.add.audio('jump4')];
    seOuch = game.add.audio('ouch');
	seLaunch = game.add.audio('launch');
	seSpin = game.add.audio('spinning');
}

function createEnemies () {

    for (var y = 0; y < 2; y++)
    {
		var enemy = enemies.create(game.world.width, y * 200, 'enemy');
		enemy.anchor.setTo(0.5, 0.5);
		enemy.play();
		enemy.body.moves = false;
    }

    enemies.y = 380;
}

function update() {

	//Check if player is on floor
	game.physics.arcade.collide(player, layer);

    if (player.alive)
    {	
        checkJump();
		
        if (game.time.now > firingTimer)
        {
            enemyFires();
        }

		//TODO: test this logic after implement items. Ignore it for now
		if (game.time.now > powerTimer && isPowerActivated())
		{
			if(powerFading)
			{
				blinkPower();
			}else{
				stopsPower();
			}
		}

        //  Run collision
        game.physics.arcade.overlap(enemyStars, player, enemyHitsPlayer, null, this);
		//TODO: test this logic after implement items. Ignore it for now
		if(item != null){
        	game.physics.arcade.overlap(item, player, playerGetsObject, null, this);
		}
	}
}

function checkJump(){

	//Check the normal jump. 
	if (buttonDown && player.body.onFloor())
	{
		playJump();
		buttonDown = false
		jumpPreparation = player.play('prepareJump');
	}
	//Check the double jump.
	else if(buttonDown && !player.body.onFloor() && !doubleJump)  
	{
		playJump();
		buttonDown = false;
		doubleJump = true;
		player.body.velocity.y = -920;
	}
	
	if(player.body.onFloor())
	{
		doubleJump = false;
		if(jumping){
			shadow.play('shadow3');
			tumble = player.play('fall');
			jumping = false;		
		}else if (jumpPreparation != null && jumpPreparation.isFinished){
			player.body.velocity.y = -1020;
			player.play('jump');
			shadow.play('shadow2');	
			jumping = true;
			jumpPreparation = null;
		}else if(jumpPreparation == null && (tumble == null || tumble.isFinished)){
			shadow.play('shadow1');	
			player.play('ready');
			tumble = null;
		}
	}
}

function playJump(){
	var random = game.rnd.integerInRange(0,jumpSounds.length-1);
	jumpSounds[random].play();
}

function render() {
	//only for debug matters
	//game.debug.text(game.time.physicsElapsed);
    //game.debug.body(player);
    //game.debug.bodyInfo(player);

}

function enemyHitsPlayer (player,star) {
    //TODO: test this logic after implement items. Ignore it for now
	if(hasArmor)
	{
		stopPower();
	}
	//TODO: test this logic after implement items. Ignore it for now
	else if(!hasForceField)
	{
		// DIE, you lame ninja!
		player.kill();
		star.kill();
		enemyStars.callAll('kill');
		enemyStarsShadow.callAll('kill');
		seOuch.play();
		seLaunch.stop();
		seSpin.stop();

		gameover.visible = true;
		stateText.text="Click to restart";
		stateText.visible = true;
		 
		stateText2.text = stateText.text;
		stateText2.visible = true;
		//the "click to restart" handler
		game.input.onTap.addOnce(restart,this);
	}

}

//TODO: test this logic after implement items. Ignore it for now
function playerGetsObject(){
	switch(itemNumber){
		case 0:
			itemSprite = game.add.sprite(player.body.x, player.body.y, 'ship');
			hasArmor = true;
			break;
		case 1:
			itemSprite = game.add.sprite(player.body.x, player.body.y, 'ship');
			hasForceField = true;
			break;
		case 2:
			itemSprite = game.add.sprite(player.body.x, player.body.y, 'ship');
			hasAttack = true;
			break;
		default: 
		return;
	}
	item = null;
	powerTimer = game.time.now + 5000;
}

//TODO: test this logic after implement items. Ignore it for now
function blinkPower(){
	itemSprite = game.add.animation(itemSprite.body.x, itemSprite.body.y, itemSprite.key);
}

//TODO: test this logic after implement items. Ignore it for now
function stopPower(){
	resetItem();
	itemSprite = null;
	hasArmor = false;
	hasAttack = false;
	hasForceField = false;
}

//TODO: test this logic after implement items. Ignore it for now
function isPowerActivated(){
	return hasArmor || hasAttack || hasForceField;
}

function enemyFires () {
	//TODO: test this logic after implement items. Ignore it for now
    var isItem = false;//(game.rnd.integerInRange(0,9) == 1 && !isPowerActivated());
    if(isItem)
	{
		throwObj(getItem());	
		return;
	}
    //  Grab the first star we can from the pool
    enemyStar = enemyStars.getFirstExists(false);

	enemies.forEachAlive(function(enemy){

        // put every enemy in an array
        livingEnemies.push(enemy);
    });
	
    if (enemyStar)
    {
		enemyStar.body.setSize(30, 30, 15, 15);
		enemyStar.animations.add('spin', [ 0, 1, 2 ], 20, true);
		enemyStar.animations.play('spin');
		seLaunch.play();
		seSpin.play();
		//triggers event to sum +1 into the score
		enemyStar.events.onOutOfBounds.add( resetEnemyStar, this );
		throwObj(enemyStar);
    }
}

function throwObj(obj){
	//logic to not allow more than 2 stars in a row in the same line (too hard to escape)
	do{
		var random = game.rnd.integerInRange(0,enemies.length-1);
			
		if(tempRandom == random)
		{
			inaRow++;
		}else{
			inaRow = 0;
		}		
	}while(inaRow >= 2);
	
	var starShadow = enemyStarsShadow.getFirstExists(false);
	if(random == 0)
	{
		starShadow.frame = 1;
	}else{
		starShadow.frame = 0;
	}
	
	tempRandom = random;
	// randomly select one of them
   	var shooter=livingEnemies[random];
   	// And fire the star from this enemy
	var speed = -(game.rnd.integerInRange((400 + (5*score)),600 + (5*score)));
   	obj.reset(shooter.body.x, shooter.body.y+25);
	obj.body.allowGravity = false;
	obj.body.velocity.x = speed;
	
	starShadow.reset(shooter.body.x, shadow.y+18);
	starShadow.body.allowGravity = false;
	starShadow.body.velocity.x = speed;
	
    firingTimer = game.time.now + (game.rnd.integerInRange(800 - (5*score),1000 - (5*score)));
}

//TODO: test this logic after implement items. Ignore it for now
function getItem(){
	itemNumber = game.rnd.integerInRange(0,2);
	switch(itemNumber){
		case 0:
			item = game.add.sprite(-500, -500, 'ship');
			break;
		case 1:
			item = game.add.sprite(-500, -500, 'ship');
			break;
		case 2:
			item = game.add.sprite(-500, -500, 'ship');
			break;
	}
	item.events.onOutOfBounds.add( resetItem, this );
}

function resetEnemyStar (enemyStar) {

    //  Called if the star goes out of the screen
    enemyStar.kill();
	
    //  Increase the score
    score++;
    scoreText.text = scoreString + score;
	scoreText2.text = scoreText.text;
}

//TODO: test this logic after implement items. Ignore it for now
function resetItem(){
	item = null;
	itemNumber  = -1;
}

function restart () {
    // Refresh enemies
    enemies.removeAll();
    createEnemies();
	
	//TODO: test this logic after implement items. Ignore it for now
	itemSprite = null;
	hasArmor = false;
	hasAttack = false;
	hasForceField = false;

    //revives the player
    player.revive();
	player.reset(30, 410);
	
    //hides the text
    stateText.visible = false;
	stateText2.visible = false;
	score = 0;
	scoreText.text = scoreString + score;
	scoreText2.text = scoreText.text;
	gameover.visible = false;
}