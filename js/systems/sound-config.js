/* VOLUME MIXER: the one place to turn sounds up or down.
   Every value is a multiplier on that sound's built-in level: 1 = unchanged, 0.5 = half as loud (-6 dB), 2 = twice as loud (+6 dB), 0 = silent.
   Edit a number, save and reload the game. */
export const VOLUME = {
  master: 0.9,          // everything (the M key mutes it)

  /* what follows the rider */
  tyres: 0.75,            // rolling on asphalt
  cobblestone: 0.75,      // rolling on cobbles and park paths
  pedalling: 0.2,       // your own pedalling
  motor: 1,             // scooter and e-bike motors
  wind: 1,              // wind rush (louder as you speed up)
  jacket: 0.3,            // jacket flapping at high speed
  rain: 1,
  city: 1,              // the background city ambience
  brakes: 1,            // brake squeal

  /* traffic driving past (with Doppler) */
  tram: 1.8,
  car: 1.6,
  bmw: 1.3,             // the BMW's engine
  courier: 1,           // the speed-pedelec courier's motor
  cyclists: 0.8,        // other cyclists pedalling

  /* crashes and hits */
  bikeClatter: 1.2,     // the bike hitting the road, whenever you fall or hit something
  carImpact: 1,         // metal on metal: cars, trams, roadworks, exploding cars
  hits: 1,              // small thumps and clatters: cones, signs, car doors, rolling over a fallen rider
  riderVoice: 1,        // your own "ouch" / "woah"
  victimVoice: 1,       // people and cyclists you knock flying

  /* people and traffic reacting */
  yelpOnBell: 0.35,     // pedestrians yelping when you ring your bell at them
  shout: 1,             // cyclists and blocked pedestrians shouting "hey"
  nearMiss: 1,
  horn: 1,              // car horns (the BMW, and cars you pass close)
  doorOpen: 1,          // a parked car's door swinging open

  /* bumps */
  railBump: 1.6,        // bump when your wheels cross a tram rail
  landing: 1,           // landing a jump
  jump: 1,              // take-off
  pothole: 1,

  /* pickups and menus */
  bell: 1,              // your bell
  courierBell: 1,       // the courier's "ring ring"
  coin: 1,
  helmet: 1,
  ui: 1,                // garage buy / equip
  coinCounter: 1        // coins counting up on the game-over ticket
};
