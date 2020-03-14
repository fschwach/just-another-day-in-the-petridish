function doSetup() {
    let statusDefined: boolean = false
    let isSender: boolean
    let senderType: string

    let animationIcons1 = [images.createImage(`
    . . . . .
    . . . . .
    . . # . .
    . . . . .
    . . . . .
    `), images.createImage(`
    . . . . .
    . . . . .
    . # # # .
    . . . . .
    . . . . .
    `), images.createImage(`
    . . . . .
    . # . # .
    # # . # #
    . # . # .
    . . . . .
    `)]
    let timer = 0
    let animationIconsIndex = 0
    animationIcons1[animationIconsIndex].showImage(0)

    // press A for sender: food
    // A + B for sender antibiotic
    // B for player
    // TODO the trasnmit power should probably be
    // set randomly so we have sources of varying strength
    input.onButtonPressed(Button.A, function () {
        statusDefined = true
        isSender = true
        senderType = "food"
        radio.setTransmitPower(7)
    })
    input.onButtonPressed(Button.AB, function () {
        statusDefined = true
        isSender = true
        senderType = "antibiotic"
        radio.setTransmitPower(1)
    })
    input.onButtonPressed(Button.B, function () {
        statusDefined = true
        isSender = false
        senderType = ""
    })

    // display the animation to show we are waiting for input
    while (statusDefined == false) {
        timer += 1
        if (timer % 50 == 0) {
            animationIconsIndex += 1
            if (animationIconsIndex > animationIcons1.length - 1) {
                animationIconsIndex = 0
            }
            animationIcons1[animationIconsIndex].showImage(0)
        }
    }
    basic.clearScreen()
    return { senderType: senderType, isSender: isSender }
}

// make the player listen to incoming signals
// from food and antibiotic sources and set the
// global signal strengh variable for these signals
// The signal strenght is converted to a percentage
// and a minimum threshold is applied to set any
// signal below the threshold to zero, thus discarding
// weak signals
radio.onReceivedString(function (receivedString) {
    if (isSender == false) {
        currentSignal[receivedString].signal = radio.receivedPacket(RadioPacketProperty.SignalStrength)
        currentSignal[receivedString].time = input.runningTime()
    }
})

radio.setGroup(1)
let score = 0
let setup = doSetup()
let isSender = setup.isSender
let senderType = setup.senderType

// some animations to play on the sender
let senderActivityIconsAntibiotic = [
    images.iconImage(IconNames.Skull),
    images.iconImage(IconNames.No)
]
let senderActivityIconsFood = [
    images.iconImage(IconNames.Heart),
    images.iconImage(IconNames.SmallHeart)
]

// currDirection is the currently intended direction to walk
// directionHint is calculated from the difference between intended
// and actual direction
let currDirection: number
let directionHint: string = ""

// these keep track of the last time a shake
// was trigger to reset direction and define
// a mininimum time that needs to pas between shakes
let lastShakeTime: number = input.runningTime() 
let minTimePassShake: number = 5000

// this object will have one key for food and one for antibiotic
// and each slots stores the signal strength and time of the last
// received signal of this type
let currentSignal: { [index: string]: any; } = {
    antibiotic: { signal: 0, time: 0 },
    food: { signal: 0, time: 0 },
    light: { signal: 0, time: 0 }
}

// keep track of the plasmids we have
let plasmidsObtained: { [index: string]: any; } = { 
    antibiotic: false, 
    food: false, 
    light: false
}

// setup the external display LEDs
// for now, assue we use 5 ZIP (Neopixel) LED strips
// but we might replace some of them with individual LEDs to
// allow more space between the LEDS (such as for the indicators of 
// obtained plasmids
let stripScore: neopixel.Strip = null
let stripFood: neopixel.Strip = null
let stripAntibiotic: neopixel.Strip = null
let stripPlasmids: neopixel.Strip = null
let stripDirection: neopixel.Strip = null

stripScore = neopixel.create(DigitalPin.P0, 5, NeoPixelMode.RGB)
stripFood = neopixel.create(DigitalPin.P1, 5, NeoPixelMode.RGB)
stripAntibiotic = neopixel.create(DigitalPin.P8, 5, NeoPixelMode.RGB)
stripPlasmids = neopixel.create(DigitalPin.P12, 5, NeoPixelMode.RGB)
stripDirection = neopixel.create(DigitalPin.P2, 5, NeoPixelMode.RGB)

// define the coloures of the LEDs in the strips
// as RGB values
let stripColours5: number[][] = [ 
    [ 255,0,0 ],
    [ 255,50,0 ],
    [ 255,155,0],
    [ 255, 255, 0],
    [ 0, 255, 0] 
]

// change this to switch display type between the onboard
// LED matrix and external neopixel strips
// there might be others in the future
let displayTypes = [ "onboard", "extLEDs" ] 
let displayType = displayTypes[1]


if (isSender == true) {
    //    basic.showString(senderType)
} else {
    //    basic.showString("Player")
    currDirection = input.compassHeading()
}

// follwoing setup, clear the button event handlers
input.onButtonPressed(Button.AB, function () {
})
input.onButtonPressed(Button.A, function () {
})
input.onButtonPressed(Button.B, function () {
})


// TODO remove
// This is just here for testing: player can press buttons A+B
// to obtain the antibiotic resistance plasmid
// What we need instead is for the player to send their plasmids
// to players in the vicinity when a button is pressed 
input.onButtonPressed(Button.A, function () {
    if (isSender == false) {
        plasmidsObtained["food"] =  true
    }
})
input.onButtonPressed(Button.B, function () {
    if (isSender == false) {
        plasmidsObtained["antibiotic"] =  true
    }
})



// event handler for shake gesture on the player:
// set a new random direction
// A minimum time needs to pass between shakes
// TODO the visual hint that the gesture has been
// deployed, is not working because this is happening in 
// a thread and other threads will be overwriting the display
// in the meantime. An audio clue would work better but it 
// needs a buzzer to be attached
// or we could set a global flag that can be seen in the 
// display function, which would then display the visual
// hint instead of the game status
input.onGesture(Gesture.Shake, function () {
    if (isSender == false ) {
        if ( input.runningTime() - lastShakeTime >= minTimePassShake ) {
            basic.clearScreen()
            images.iconImage(IconNames.Target).showImage(0)
            basic.pause(1000)
            currDirection = Math.randomRange(0, 359)
            lastShakeTime = input.runningTime()
            basic.clearScreen()
            // on te external LED screen, this should switch
            // on briefly the shake LED in green colour
        } else {
            // min time hasn't passed yet
            // on the external LEDs, this should switch the 
            // shake status LED to red
            basic.clearScreen()
            images.iconImage(IconNames.No).showImage(0)
            basic.pause(1000)
            basic.clearScreen()
        }

    }
})

// get a direction hint by comparing the actual
// compass heading to the currently intended direction 
// but apply some slack (30 degrees either side) so we
// dont' get too many instructions
// The hint is : sharp left, left, straight, right or sharp right
function getDirectionHint(currDirection: number) {
    let hint: string = ""
    let dirDiff = input.compassHeading() - currDirection
    if (dirDiff < 0) {
        dirDiff = dirDiff + 360
    }
    if (Math.abs(dirDiff) < 30) {
        hint = "straight"
    } else {
        if (dirDiff < 90) {
            hint = "left"
        } else if (dirDiff < 180) {
            hint = "sharp left"
        } else if (dirDiff < 270) {
            hint = "sharp right"
        } else {
            hint = "right"
        }
    }
    return hint
}



// summarise the radio signals and return
// as percetages
// For each signal, insure that it is recent
// or set to zero if it is too old (>3 seconds)
// TODO Make sure we are recordig only
// the strongest signal of any type by
// comparing the current signal to the most
// recent previous one within range
// For this, we will need another slot in the 
// signal object to record the previous signal
// strength and use the new one only if the old one
// is too old (>3 sec) or the new one is stronger
// 
// The radio signal strength varies from -128 (weak) 
// to -42 (strongest) and we apply a threshold
// so that weak signals are just set to zero
function getNormalisedSignal(signal: any) {
    let threshold = 10
    let normSig = ((signal.signal + 128) / 86) * 100
    if (input.runningTime() - signal.time > 3000 || normSig < threshold) {
        normSig = 0
    }
    return normSig
}

// turn a single score of some sort to a bar in one row
// provide the score, the maximum value the score can have
// and the row on the display into which to plot
function disaplyScoreToRow(myScore: number, maxScore: number, row: number) {
    let normScore = Math.round((myScore / maxScore) * 5)
    for (let index = 0; index <= 4; index++) {
        if (normScore >= index + 1) {
            led.plot(index, row)
        } else {
            led.unplot(index, row)
        }
    }
}

// turn a single score of some sort to a bar on a Neopixel strip
// provide the score, the maximum value the score can have
// and the neopxiel-strip variable
function disaplyScoreToStrip(myScore: number, maxScore: number, strip: any) {
    let normScore = Math.round((myScore / maxScore) * 5)
    strip.clear()
    for (let index = 0; index <= 4; index++) {
        if (normScore >= index + 1) {
            let r = stripColours5[index][0]
            let g = stripColours5[index][1]
            let b = stripColours5[index][2]
            strip.setPixelColor( index, neopixel.rgb(r,g,b))
        } 
    }
    strip.show()
}

// display the game status:
// score
// antibiotic signal
// food signal
// plasmids: food,antibio resistance,light
// direction hint
function display(displayType: string, normAntibioticSignal: number, normFoodSignal: number, score: number, directionHint: string, plasmidsObtained: any ) {
    if ( displayType == "onboard" ){
        displayOnboard(normAntibioticSignal, normFoodSignal, score, directionHint, plasmidsObtained)
    } else if ( displayType == "extLEDs" ){
        displayExtleds(normAntibioticSignal, normFoodSignal, score, directionHint, plasmidsObtained)
    }
}

// display the game status on external LED strips
function displayExtleds(normAntibioticSignal: number, normFoodSignal: number, score: number, directionHint: string, plasmidsObtained: any ) {
    disaplyScoreToStrip(score, 100, stripScore)
    disaplyScoreToStrip(normFoodSignal, 100, stripFood)
    disaplyScoreToStrip(normAntibioticSignal, 100, stripAntibiotic)

    // plasmids
    stripPlasmids.clear()
     if (plasmidsObtained["food"] == true) {
        stripPlasmids.setPixelColor(0, neopixel.colors(NeoPixelColors.Green))
    }
    if (plasmidsObtained["antibiotic"] == true) {
        stripPlasmids.setPixelColor(1, neopixel.colors(NeoPixelColors.Blue))
    }
    stripPlasmids.show()

    // direction hint
    stripDirection.clear()
    if (!(directionHint.isEmpty())) {
        if (directionHint == "sharp left") {
            stripDirection.setPixelColor(0, neopixel.colors(NeoPixelColors.Red))
        } else if (directionHint == "left") {
            stripDirection.setPixelColor(1, neopixel.colors(NeoPixelColors.Orange))
        } else if (directionHint == "straight") {
            stripDirection.setPixelColor(2, neopixel.colors(NeoPixelColors.Green))
        } else if (directionHint == "right") {
            stripDirection.setPixelColor(3, neopixel.colors(NeoPixelColors.Orange))
        } else if (directionHint == "sharp right") {
            stripDirection.setPixelColor(4, neopixel.colors(NeoPixelColors.Red))
        }
    }
    stripDirection.show()

}

// display the game status on the onboard 5x5 LED matrix
function displayOnboard(normAntibioticSignal: number, normFoodSignal: number, score: number, directionHint: string, plasmidsObtained: any ) {
    disaplyScoreToRow(score, 100, 0)
    disaplyScoreToRow(normFoodSignal, 100, 1)
    disaplyScoreToRow(normAntibioticSignal, 100, 2)

    // clear the bottom two rows for plasmid and direction hint
    for (let i = 3; i <= 4; i++) {
        for (let j = 0; j <= 4; j++) {
            led.unplot(j, i)
        }
    }

    // plasmids
    if (plasmidsObtained["food"] == true) {
        led.plot(0, 3)
    }
    if (plasmidsObtained["antibiotic"] == true) {
        led.plot(1, 3)
    }

    if (!(directionHint.isEmpty())) {
        if (directionHint == "sharp left") {
            led.plot(0, 4)
        } else if (directionHint == "left") {
            led.plot(1, 4)
        } else if (directionHint == "straight") {
            led.plot(2, 4)
        } else if (directionHint == "right") {
            led.plot(3, 4)
        } else if (directionHint == "sharp right") {
            led.plot(4, 4)
        }
    }
}




// main loop
while (true) {
    if (isSender == true) {
        // device is a sender (source of food etc)
        radio.sendString(senderType)
        if (senderType == "antibiotic") {
            senderActivityIconsAntibiotic[0].showImage(0)
            basic.pause(100)
            senderActivityIconsAntibiotic[1].showImage(0)
        } else if (senderType == "food") {
            senderActivityIconsFood[0].showImage(0)
            basic.pause(100)
            senderActivityIconsFood[1].showImage(0)
        } else {
            basic.showIcon(IconNames.Diamond)
            basic.pause(100)
            basic.showIcon(IconNames.SmallDiamond)
        }

    } else {
        // device is a player
        directionHint = getDirectionHint(currDirection)

        // currentSignal object gets updated in the background
        // by the receivedradiosignal event
        let normSignalFood = getNormalisedSignal(currentSignal.food)
        let normSignalAntibiotic = getNormalisedSignal(currentSignal.antibiotic)

        // player looses points if exposed to antibiotic without resistance
        // plasmid and can not feed in that case
        if (normSignalAntibiotic >= 50 && !plasmidsObtained["antibiotic"]) {
            score += -1

        // TODO: need to make sure the player doesn't just stay at one 
        // food source until they reach max score.
        // Each source sends a unique ID which we can use to make sure the
        // player can only get a certain number of points from that sourcer before
        // having to move on. Need a dictionary object to track food 
        // sources visited
        } else if (normSignalFood >= 50 && plasmidsObtained["food"]) {
            score += 0.5
        }

        if (score > 100) {
            score = 100
        } else if (score < 0) {
            score = 0
        }

        display(displayType, normSignalAntibiotic, normSignalFood, score, directionHint, plasmidsObtained)
        // pause a bit: may not be necessary but might make display more stable
        basic.pause(50)
        
    }
}
