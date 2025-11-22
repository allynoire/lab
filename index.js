/**
 * A two dimensional vector
 */
class Vec2 {
    constructor(x, y) {
        this.set(x, y)
    }

    set(x, y) {
        this.x = x ?? 0
        this.y = y ?? x ?? 0
    }

    perp() { return new Vec2(-this.y, this.x) }
    copy() { return new Vec2(this.x, this.y)}
    neg() { return new Vec2(-this.x, -this.y) }
    dot(other) { return this.x * other.x + this.y * other.y }
    len() { return Math.sqrt(this.x * this.x + this.y * this.y)}
    add(other) { return new Vec2(this.x + (other.x ?? other), this.y + (other.y ?? other)) }
    sub(other) { return new Vec2(this.x - (other.x ?? other), this.y - (other.y ?? other)) }
    mul(other) { return new Vec2(this.x * (other.x ?? other), this.y * (other.y ?? other)) }
    div(other) { return new Vec2(this.x / (other.x ?? other), this.y / (other.y ?? other)) }
    normal() { return this.len() > 0 ? this.div(this.len()) : vec2() }
    angle() { return Math.atan2(this.y, this.x) }
    dist(other) { return other.sub(this).len() }
}

/**
 * A physics particle with mass
 */
class PointMass {
    constructor({mass=1, drag=0.0, position=vec2(), velocity=vec2(), fillStyle='red', visible=true}) {
        this.mass = mass
        this.drag = drag
        this.position = position.copy()
        this.velocity = velocity.copy()
        this.force = vec2()
        this.lastForce = vec2()
        this.fillStyle = fillStyle
        this.visible = visible
    }

    applyForce(force) {
        this.force = this.force.add(force)
    }

    update(delta) {
        this.position = this.position.add(this.velocity.mul(delta))
        this.velocity = this.velocity
            .add(this.force.div(this.mass).mul(delta))
            .sub(this.velocity.mul(this.drag))

        // reset force for frame
        this.lastForce = this.force
        this.force = vec2()
        
        // snap velocity to prevent absolute chaos
        if (this.velocity.len() < 1e-3)
            this.velocity = vec2()

    }

    draw(ctx) {
        const s = .1 * this.mass;
        ctx.fillStyle = this.fillStyle
        ctx.fillRect(this.position.x - s/2, this.position.y - s/2, s, s)
    }
}

/**
 * A joint that simulates spring forces on the attached masses
 */
class SpringJoint {

    constructor({springFactor=1, springLength=1, m1=null, m2=null, strokeStyle='blue', visible=true}) {
        this.springFactor = springFactor
        this.springLength = springLength
        this.strokeStyle = strokeStyle
        this.join([m1, m2])
        this.visible = visible
    }

    isJoined() { return this.m1 && this.m2 }

    update(delta) {
        if (!this.isJoined()) return

        const a = this.m1.position
        const b = this.m2.position
        const v = b.sub(a)
        const force = v.normal().mul((v.len() - this.springLength) * this.springFactor)

        this.m1.applyForce(force)
        this.m2.applyForce(force.neg())
        
    }

    join([m1, m2]) {
        this.m1 = m1
        this.m2 = m2
    }

    draw(ctx) {
        if (!this.isJoined()) return
        const { x:x1, y:y1 } = this.m1.position
        const { x:x2, y:y2 } = this.m2.position
        ctx.strokeStyle = this.strokeStyle
        ctx.lineWidth = .01
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    static joinAll(springs, masses, closed=false) {
        const a = closed ? shl(masses, 1) : masses.slice(1)
        zip([springs, masses, a]).forEach(([j, m1, m2]) => j.join([m1, m2]));
    }
}

/**
 * A joint that simulates angular forces on a pair of three masses
 * Kinda broken, idk how this works...
 */
class HingeJoint {

    constructor({springFactor=1, springAngle=Math.PI/2, m1=null, m2=null, m3=null, strokeStyle='blue', visible=true}) {
        this.springFactor = springFactor
        this.springAngle = springAngle
        this.strokeStyle = strokeStyle
        this.visible = visible
        this.join([m1, m2, m3])
    }

    update(delta) {
        if (!this.isJoined()) return

        const p1 = this.m1.position
        const p2 = this.m2.position
        const p3 = this.m3.position

        const u = p1.sub(p2).normal()
        const v = p3.sub(p2).normal()

        const cos = v.dot(u)
        const theta = Math.acos(cos)
        const q = 1 - Math.min(theta, this.springAngle) / this.springAngle

        const force = q * this.springFactor

        this.m1.applyForce(u.perp().mul(force))
        this.m3.applyForce(v.perp().mul(-force))
    }

    draw(ctx) {
        if (!this.isJoined()) return
        const p1 = this.m1.position
        const p2 = this.m2.position
        const p3 = this.m3.position
        
        const start = p1.sub(p2).angle()
        const end = p3.sub(p2).angle()

        ctx.strokeStyle = this.strokeStyle
        ctx.lineWidth = .01
        ctx.beginPath()
        ctx.arc(p2.x, p2.y, 0.2, start, end, true)
        ctx.stroke()
    }

    isJoined() { return this.m1 && this.m2 && this.m3 }

    join([m1, m2, m3]) {
        this.m1 = m1
        this.m2 = m2
        this.m3 = m3
    }

    static joinAll(hinges, masses, closed=false) {
        const a = closed ? shl(masses) : masses.slice(1)
        const b = closed ? shl(masses, 2) : masses.slice(2)
        zip([hinges, masses, a, b]).forEach(([j, m1, m2, m3]) => j.join([m1, m2, m3]));
    } 
}

/**
 * A joint that transmits forces between two points
 * Idk if this is a thing but it makes stuff nicer
 */
class ForceJoint {

    constructor({ factor=.9, m1=null, m2=null, visible=true }) {
        this.factor = factor
        this.join([m1, m2])
        this.visible = visible
    }

    join([m1, m2]) {
        this.m1 = m1
        this.m2 = m2
    }

    static joinAll(joints, masses, closed=false) {
        const a = closed ? shl(masses) : masses.slice(1)
        zip([joints, masses, a]).forEach(([j, m1, m2]) => j.join([m1, m2]));
    } 

    isJoined() { return this.m1 && this.m2 }

    update(delta) {
        if (!this.isJoined()) return

        const f1 = this.m1.lastForce.mul(this.factor)
        const f2 = this.m2.lastForce.mul(this.factor)

        const n = this.m2.position.sub(this.m1.position).normal()


        this.m1.applyForce(n.mul(f2.dot(n)))
        this.m2.applyForce(n.mul(f1.dot(n)))

    }

    draw(ctx) {
        if (!this.isJoined()) return
        const p1 = this.m1.position
        const p2 = this.m2.position
        ctx.strokeStyle = this.strokeStyle
        ctx.lineWidth = .01
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
    }

}

/**
 * A b-spline approximation using chaikin's refinement method
 */
class BSpline {

    constructor({ controlPoints, iterations=2, closed=true }) {
        this.controlPoints = controlPoints
        this.points = []
        this.iterations = iterations
        this.closed = closed
    }

    update() {
        if (this.controlPoints.length < 2) return
        this.points = this.controlPoints.map(it => it.position)
        if (this.closed)
            this.points.push(this.points[0], this.points[1])
        for (let i = 0; i < this.iterations; ++i)
            this.points = chaikin(this.points)
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {

        if (this.points.length < 2)
            return

        const p0 = this.points[0]

        ctx.lineWidth = .1
        ctx.strokeStyle = 'hotpink'
        ctx.beginPath()

        ctx.moveTo(p0.x, p0.y)
        for (let i = 1; i < this.points.length; ++i) {
            const p = this.points[i]
            ctx.lineTo(p.x, p.y)
        }


        ctx.stroke()
    }

}

/**
 * Creates a new vector 
 */
function vec2(x, y) { return new Vec2(x, y) }

/**
 * Merges the elements of multiple sequences into one
 */
function zip(rows) {
    return rows[0].map((_, i) => rows.map(row => row[i]))
}

/**
 * shifts the contents of an array to the left
 */
function shl(array, count=1) {
    const copy = array.slice(count)
    copy.push(...array.slice(0, count))
    return copy
}

/**
 * Creates multiple instances of an object
 */
function make(count=1, Class, opts) {
    const objs = []
    for (let i = 0; i < count; ++i)
        objs.push(new Class(opts))
    return objs;
}

/**
 * Arranges points inside a circle
 */
function arrange(objs, { center=vec2(), radius=1, randomize=false }={}) {
    const n = objs.length
    for (let i = 0; i < n; ++i) {
        let r, t
        if (randomize) {
            r = Math.random() * radius
            t = Math.random() * 2 * Math.PI
        } 
        else {
            r = radius
            t = i/n * 2 * Math.PI
        }
        objs[i].position.x = Math.cos(t) * r + center.x
        objs[i].position.y = Math.sin(t) * r + center.y
    }
}

/**
 * Applies chaikin's refinement method to a set of points
 */
function chaikin(points) {
    const newPoints = []
    for (let i = 1; i < points.length; ++i) {
        newPoints.push(points[i-1].mul(.75).add(points[i].mul(.25)))
        newPoints.push(points[i-1].mul(.25).add(points[i].mul(.75)))
    }
    return newPoints;
}

/**
 * Initializes the scene objects
 */
function init() {
    const n = 10
    const closed = false

    const masses = make(n, PointMass, {
        mass: 1,
        drag: 1,
        position: vec2(0),
        fillStyle: 'red',
        visible: false
    })

    const springs = make(n, SpringJoint, {
        springFactor: 500,
        springLength: 1,
        visible: false
    })

    const hinges = make(n, HingeJoint, {
        springFactor: 40.,
        springAngle: 1. * Math.PI
    })

    const joints = make(n, ForceJoint, {
        factor: 0.5,
        visible: false
    })

    const spline = new BSpline({ 
        controlPoints: masses,
        iterations: 3,
        closed
    })

    SpringJoint.joinAll(springs, masses, closed)
    // HingeJoint.joinAll(hinges, masses, closed)
    ForceJoint.joinAll(joints, masses)
    // joints[0].join(masses)

    arrange(masses, { radius:2, randomize: true })

    return { bodies: [ ...masses, ...hinges, ...springs, ...joints, spline ] }
}

/**
 * Processes the next frame
 */
function draw(time) {
    if (lastTime === 0) lastTime = time
    const delta = (time - lastTime) / 1000
    lastTime = time

    // Draw all objects
    ctx.clearRect(-a, -a, 2*a, 2*a)
    for (const body of bodies) {
        if (body.visible === false) 
            continue
        if (body.draw) 
            body.draw(ctx)
    }
    
    // Update all objects
    for (const body of bodies) {
        if (body.update) body.update(delta)
    }

    input(delta)
    requestAnimationFrame(draw)
}
let lastTime = 0

/**
 * Handles cursor input
 */
function input(delta) {
    cursor.velocity = cursor.position.sub(cursor.lastPosition).div(delta)
    cursor.lastPosition.set(cursor.position.x, cursor.position.y)
    

    // if (!cursor.pressed) cursor.selection = null

    if (!cursor.selection) {

        let nearest = null
        let minDist = Number.POSITIVE_INFINITY
        for (const body of bodies.filter(it => it instanceof PointMass)) {
            const dist = body.position.dist(cursor.position)
            if (minDist < dist) continue
            minDist = dist
            nearest = body
        }

        if (minDist < cursor.range) {
            if (cursor.pressed)
                cursor.selection = nearest
            ctx.fillStyle = 'green'
            ctx.fillRect(nearest.position.x, nearest.position.y, 0.1, 0.1)
        }
    }
    else {
        ctx.fillStyle = 'yellow'
        ctx.fillRect(cursor.selection.position.x, cursor.selection.position.y, 0.1, 0.1)
        if (!cursor.pressed)
            cursor.selection = null
    }
    
    if (cursor.selection) {

        const v = cursor.position.sub(cursor.selection.position)
        const force = v.mul(1000)
        cursor.selection.applyForce(force)
    }
}


const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

// Handle canvas resize
const resize = () => {
    canvas.width = canvas.clientWidth * window.devicePixelRatio
    canvas.height = canvas.clientHeight * window.devicePixelRatio
}
resize()
// const observer = new ResizeObserver(resize)
// observer.observe(canvas)

// context transform
const size = 10
const a = Math.min(canvas.width, canvas.height) / size
const T = new DOMMatrix().translate(canvas.width/2, canvas.height/2).scale(a, a)
const iT = T.inverse()
ctx.setTransform(T)


const cursor = {
    position: vec2(),
    lastPosition: vec2(),
    velocity: vec2(),
    pressed: false,
    selection: null,
    range: 0.5
}
/**
 * 
 * @param {MouseEvent} ev 
 */
canvas.onmousemove = (ev) => {
    const p = new DOMPoint(ev.offsetX, ev.offsetY).matrixTransform(iT)
    cursor.position.set(p.x, p.y)
}
canvas.onmousedown = (ev) => {
    cursor.pressed = true
}
canvas.onmouseup = (ev) => {
    cursor.pressed = false
}
canvas.onmouseleave = (ev) => {
    cursor.pressed = false
}

const { bodies } = init()

requestAnimationFrame(draw)
