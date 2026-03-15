const springR = 5
const catR = 0
const catDist = 15
const springs = []
const edges = []
const maxPushDist = 50
const simSteps = 50
let lastCatPos
const darkCatFur = 0
let darkCatFurPos

function setup() {
  createCanvas(600, 800);
  
  edges.push({ from: createVector(100, 100), to: createVector(width-100, 100) })
  edges.push({ from: createVector(width-100, 100), to: createVector(width-100, 600-100) })
  edges.push({ from: createVector(width-100, 600-100), to: createVector(100, 600-100) })
  edges.push({ from: createVector(100, 600-100), to: createVector(100, 100) })
  
  edges.push({ catOnly: true, to: createVector(200, 110), from: createVector(width-200, 110) })
  edges.push({ catOnly: true, to: createVector(width-200, 110), from: createVector(width-200, 200) })
  edges.push({ catOnly: true, to: createVector(width-200, 200), from: createVector(200, 200) })
  edges.push({ catOnly: true, to: createVector(200, 200), from: createVector(200, 110) })
  
  lastCatPos = createVector()
  darkCatFurPos = createVector(width/2, (110+200)/2)
  
  for (let i = 0; i < 200; i++) {
    springs.push({
      pos: createVector(randomGaussian(width/2, 50), randomGaussian(600*0.6, 20)),
      color: random(['red', 'blue', 'yellow', 'green', 'orange', 'purple']),
      touches: 0,
      stuckAfterTouch: null,
    })
  }
  // springs.push({ pos: createVector(width/2, 150), color: 'red' })
}

function step() {
  const spring = random(springs)
  let catPos = null
  for (let i = 0; i < 50; i++) {
    const angle = random(TWO_PI)
    const candidate = spring.pos.copy().add(
      catDist * cos(angle),
      catDist * sin(angle)
    )
    if (positionOK(candidate, catR, edges)) {
      catPos = candidate
      break
    }
  }
  
  if (!catPos) return
  lastCatPos = catPos
  
  let len = random(maxPushDist)
  let start = spring.pos.copy()
  let angle = start.copy().sub(catPos)
  angle = angle.normalize().slerp(darkCatFurPos.copy().sub(spring.pos).normalize(), 1 - Math.exp(-darkCatFur / spring.pos.copy().sub(darkCatFurPos).magSq()))
  let newPos = angle.copy().setMag(len).add(start)
  let intersections = edges
    .filter((e) => !e.catOnly)
    .map((e) => ({ edge: e, intersection: lineIntersection(e.from, e.to, spring.pos, newPos, true) }))
    .filter((i) => i.intersection)
  let iters = 0
  while (intersections.length > 0 && len > 0) {
    first = null
    firstDist = Infinity
    for (const i of intersections) {
      const d = i.intersection.dist(spring.pos)
      if (d < firstDist) {
        firstDist = d
        first = i
      }
    }
    len = max(0, len - firstDist)
    start = first.intersection
    const t = first.edge.to.copy().sub(first.edge.from).normalize()
    const n = createVector(-t.y, t.x)
    angle = reflect(angle, first.edge)
    newPos = start.copy().add(angle.setMag(len)).add(n)
    intersections = edges
      .filter((e) => !e.catOnly)
      .map((e) => ({ edge: e, intersection: lineIntersection(e.from, e.to, spring.pos, newPos, true) }))
      .filter((i) => i.intersection)
    iters++
    if (iters >= 1000) {
      // console.warn('Breaking!')
      spring.pos = start
      break
    }
  }
  if (newPos.x < 100) throw new Error('Out of bounds!')
  spring.pos = newPos
    
  spring.touches++
  if (spring.stuckAfterTouch) return
  const stuck = isStuck(spring)
  if (stuck) {
    spring.stuckAfterTouch = spring.touches
  }
}
    
function isStuck(spring) {
  let catPos = null
  for (let i = 0; i < 50; i++) {
    const angle = random(TWO_PI)
    const candidate = spring.pos.copy().add(
      catDist * cos(angle),
      catDist * sin(angle)
    )
    if (positionOK(candidate, catR, edges)) {
      return false
    }
  }
  return true
}
    
function graph() {
  const stuckSprings = springs.filter(s => s.stuckAfterTouch)
  if (stuckSprings.length === 0) return
  const maxTouches = max(stuckSprings.map(s => s.stuckAfterTouch))
  const counts = []
  for (let i = 0; i <= maxTouches; i++) {
    counts.push(stuckSprings.filter(s => s.stuckAfterTouch <= i).length / stuckSprings.length)
  }
  
  const h = 150
  noStroke()
  fill(0)
  textAlign(RIGHT, CENTER)
  text('1', 90, 0)
  text('0', 90, h)
  textAlign(CENTER, TOP)
  text('0', 100, h + 10)
  text(maxTouches, width-100, h + 10)
  noFill()
  stroke(0)
  line(100, 0, 100, h)
  line(100, h, width-100, h)
  stroke('red')
  beginShape()
  for (let i = 0; i <= maxTouches; i++) {
    vertex(
      map(i, 0, maxTouches, 100, width-100),
      map(counts[i], 0, 1, h, 0)
    )
  }
  endShape()
}
    
function mousePressed() {
  const stuckSprings = springs.filter(s => s.stuckAfterTouch)
  const maxTouches = max(stuckSprings.map(s => s.stuckAfterTouch))
  const counts = []
  for (let i = 0; i <= maxTouches; i++) {
    counts.push(stuckSprings.filter(s => s.stuckAfterTouch <= i).length / stuckSprings.length)
  }
  
  let csvLines = ['touches,probability']
  for (let i = 0; i <= maxTouches; i++) {
    csvLines.push(`${i},${1 - counts[i]}`)
  }
  saveStrings(csvLines, 'probabilities.csv')
}

function draw() {
  background(220);
  for (let i = 0; i < simSteps; i++) step()
  
  noFill()
  stroke(0)
  for (const edge of edges) {
    line(edge.from.x, edge.from.y, edge.to.x, edge.to.y)
  }
  noStroke()
  for (const spring of springs) {
    fill(spring.color)
    circle(spring.pos.x, spring.pos.y, springR)
  }
  
  push()
  translate(lastCatPos.x, lastCatPos.y)
  fill('rgb(172,116,116)')
  circle(0, 0, 20)
  pop()
  
  push()
  translate(0, 600)
  graph()
  pop()
}
  
function positionOK(pos, r, edges) {
  let inside = 0
  for (const edge of edges) {
    if (distToLine(pos, edge.from, edge.to) < catR) {
      inside--
    } else {
      inside++
    }
  }
  return inside > 0
}

function reflect(ray, edge) {
  const incident = ray.copy().normalize()
  const tan = edge.to.copy().sub(edge.from).normalize()
  const n = createVector(-tan.y, tan.x)
  const reflected = incident.copy().sub(n.copy().mult(2 * n.dot(incident)))
  return reflected
}

function distToLine(pt, a, b) {
  const aToPt = pt.copy().sub(a)
  const tan = b.copy().sub(a)
  const norm = createVector(-tan.y, tan.x).normalize()
  const d = aToPt.dot(norm)
  return d
  // return abs(d)
}
  
function lineIntersection(aFrom, aTo, bFrom, bTo, extend) {
  const ext = extend ? 0.1 : 0
	// Bounding box check
	/*const minAX = Math.min(aFrom.x, aTo.x)
	const maxAX = Math.max(aFrom.x, aTo.x)
	const minAY = Math.min(aFrom.y, aTo.y)
	const maxAY = Math.max(aFrom.y, aTo.y)
	const minBX = Math.min(bFrom.x, bTo.x)
	const maxBX = Math.max(bFrom.x, bTo.x)
	const minBY = Math.min(bFrom.y, bTo.y)
	const maxBY = Math.max(bFrom.y, bTo.y)
	if (Math.max(minAX, minBX) > Math.min(maxAX, maxBX) || Math.max(minAY, minBY) > Math.min(maxAY, maxBY)) {
		return undefined
	}*/
	
  const det =
    (aTo.x - aFrom.x) * (bTo.y - bFrom.y) -
    (bTo.x - bFrom.x) * (aTo.y - aFrom.y)
  if (det === 0) {
    // Lines are parallel
    return undefined
  } else {
    const lambda =
      ((bTo.y - bFrom.y) * (bTo.x - aFrom.x) +
        (bFrom.x - bTo.x) * (bTo.y - aFrom.y)) /
      det
    const gamma =
      ((aFrom.y - aTo.y) * (bTo.x - aFrom.x) +
        (aTo.x - aFrom.x) * (bTo.y - aFrom.y)) /
      det
    if (0-ext <= lambda && lambda <= 1+ext && 0-ext <= gamma && gamma <= 1+ext) {
      return aFrom.copy().add(aTo.copy().sub(aFrom).mult(lambda))
    } else {
      return undefined
    }
  }
}