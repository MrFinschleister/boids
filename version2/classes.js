class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static neutral() {
        return new Vector2(0, 0);
    }
    
    static unitRand() {
        let angle = Math.random() * Math.PI * 2;
        
        return new Vector2(-Math.cos(angle), Math.sin(angle));
    }

    valueOf() {
        return this.magnitude();
    }

    clone() {
        return new Vector2(this.x, this.y);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    add(v2) {
        this.x += v2.x;
        this.y += v2.y;
    }

    difference(v2) {
        return new Vector2(this.x - v2.x, this.y - v2.y);
    }

    distance(v2) {
        let xDiff = this.x - v2.x;
        let yDiff = this.y - v2.y;

        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    }

    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
    }

    multiply(v2) {
        this.x *= v2.x;
        this.y *= v2.y;
    }

    dotProd(v2) {
        return this.x * v2.x + this.y * v2.y;
    }

    average(v2) {
        return new Vector2((this.x + v2.x) / 2, (this.y * v2.y) / 2);
    }

    normalise() {
        let magnitude = this.magnitude();

        if (magnitude == 0) {
            this.x = 0;
            this.y = 0;
        } else {
            this.x /= magnitude;
            this.y /= magnitude;
        }
    }

    cap(v2) {
        if (Math.abs(this.x) > v2.x) {
            this.x = v2.x * Math.sign(this.x);
        }

        if (Math.abs(this.y) > v2.y) {
            this.y = v2.y * Math.sign(this.y);
        }
    }

    capNum(num) {
        if (this.x > num) {
            this.x = num;
        } else if (this.x < -num) {
            this.x = -num;
        }
        
        if (this.y > num) {
            this.y = num;
        } else if (this.y < -num) {
            this.y = -num;
        }
    }
}

class Boid {
    constructor(position, velocity) {
        this.position = position;
        this.velocity = velocity;
    }

    loadAttributes(index) {
        this.typeIndex = index;
        let type = types[index];

        let keys = Object.keys(type)

        for (let k of keys) {
            this[k] = type[k];
        }

        this.hitbox = Math.sqrt((this.size / 2) ** 2 * 2) * hitboxPercent;
        this.eatCooldown = boidEatCooldown;
        this.moveCooldown = 0;
    }

    force(force) {
        let newForce = force.clone();
        newForce.scale(delta / tickRate);

        this.velocity.add(force);
    }

    wrapScreen() {
        if (this.position.x < 0) {
            this.position.x += canvas.width;
        } else if (this.position.x > canvas.width) {
            this.position.x -= canvas.width;
        }


        if (this.position.y < 0) {
            this.position.y += canvas.height;
        } else if (this.position.y > canvas.height) {
            this.position.y -= canvas.height;
        }
    }

    eat(boid) {
        this.eatCooldown = boidEatCooldown;
        boid.eaten();
    }

    eaten() {
        this.moveCooldown = boidMoveCooldown;
        this.velocity.normalise();
    }

    tick() {
        this.eatCooldown--;

        let separationForce = Vector2.neutral();
        let alignmentForce = Vector2.neutral();
        let cohesionForce = Vector2.neutral();
        let escapeForce = Vector2.neutral();
        let aggressionForce = Vector2.neutral();

        let numNear = 0;
        
        let position = this.position;
        let visualRange = this.visualRange;
        let separationRadius = this.separationRadius;
        let aggression = this.aggression;
        let appearance = this.appearance;
        let attack = this.attack;
        let friendly = this.friendly;
        let hitbox = this.hitbox;
        let eatCooldown = this.eatCooldown;

        for (let i = 0; i < boids.length; i++) {
            let sel = boids[i];

            let selPosition = sel.position;

            let relativePosition = position.difference(selPosition);
            let magnitude = relativePosition.magnitude();

            if (magnitude < visualRange && sel.moveCooldown < 1) {
                let netAggression = aggression - sel.aggression;
                
                if (friendly || appearance == sel.appearance) {
                    if (magnitude < separationRadius) {
                        if (magnitude != 0) {
                            let sepForce = new Vector2(relativePosition.x / magnitude, relativePosition.y / magnitude);
                            separationForce.add(sepForce);
                        }
                    }

                    alignmentForce.add(sel.velocity);
                    cohesionForce.add(selPosition);

                    numNear++;
                } else {
                    relativePosition.scale(netAggression);

                    if (netAggression > 0) {
                        escapeForce.add(relativePosition);
                    } else {
                        if (attack && eatCooldown < 1) {
                            if (magnitude < hitbox + sel.hitbox) {
                                this.eat(sel);
                                this.eatCooldown = boidEatCooldown;
                            }
                        }
                        aggressionForce.add(relativePosition);
                    }
                }
            }
        }

        if (numNear > 0) {
            alignmentForce.scale(1 / numNear);
            cohesionForce.scale(1 / numNear);
            cohesionForce = cohesionForce.difference(position);
        }

        separationForce.scale(this.separationWeight);
        alignmentForce.scale(this.alignmentWeight);
        cohesionForce.scale(this.cohesionWeight);
        escapeForce.scale(this.escapeWeight);
        aggressionForce.scale(this.aggressionWeight);
        aggressionForce.capNum(this.aggressionCap);

        let totalForce = Vector2.neutral();

        totalForce.add(separationForce);
        totalForce.add(alignmentForce);
        totalForce.add(cohesionForce);
        totalForce.add(escapeForce);
        totalForce.add(aggressionForce);

        this.force(totalForce);
    }

    move() {
        let velMagnitude = this.velocity.magnitude();

        let adjustedSpeed = this.speed * (delta / tickRate);
        if (velMagnitude > adjustedSpeed) {
            this.velocity.scale(adjustedSpeed / velMagnitude)
        } else if (velMagnitude <= 1) {
            this.velocity.normalise();
        }

        this.velocity.scale(dampening);

        this.position.add(this.velocity);

        this.wrapScreen();
    }

    print() {
        ctx.strokeStyle = this.strokeStyle;

        let velocity = this.velocity.clone();
        velocity.normalise();

        let pX = this.position.x;
        let pY = this.position.y;
        let vX = velocity.x * this.size;
        let vY = velocity.y * this.size;

        let x1 = (pX + vX) << 0;
        let y1 = (pY + vY) << 0;
        let x2 = (pX - vX) << 0;
        let y2 = (pY - vY) << 0;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2 - vY, y2 + vX);
        ctx.lineTo(x2 + vY, y2 - vX);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }
}

class Player extends Boid {
    resetTail() {
        this.lastLastLastPos = this.position;
        this.lastLastPos = this.position;
        this.lastPos = this.position;
    }

    wrapScreen() {
        let wrappedX = false;
        let wrappedY = false;

        if (this.position.x < 0) {
            this.position.x = 0;
            wrappedX = true;
        } else if (this.position.x > canvas.width) {
            this.position.x = canvas.width;
            wrappedX = true;
        }
        if (this.position.y < 0) {
            this.position.y = 0;
            wrappedY = true;
        } else if (this.position.y > canvas.height) {
            this.position.y = canvas.height;
            wrappedY = true;
        }

        if (wrappedX) {
            this.velocity.x *= collisionDampening;
        }

        if (wrappedY) {
            this.velocity.y *= collisionDampening;
        }

        if (wrappedX || wrappedY) {
            this.resetTail();
        }
    }

    checkAttacks() {
        if (!this.attack) {
            return;
        }

        for (let i = 1; i < boids.length; i++) {
            let sel = boids[i];

            let netAggression = this.aggression - sel.aggression;
            let distance = this.position.difference(sel.position).magnitude();

            if (sel.moveCooldown < 1 && sel.typeIndex != this.typeIndex && netAggression < 0 && distance < this.hitbox + sel.hitbox) {
                this.eat(sel);
                score += (sel.speed / (this.size * this.speed * sel.size)) * eatScoreWeight;
            }
        }
    }

    tick() {
        if (mouse) {
            let difference = mouse.difference(this.position);
            let distance = difference.magnitude();

            if (difference > 0) {
                difference.scale(1 / distance);
                difference.multiply(mouseForce);
                this.force(difference);
            }
        }

        this.lastLastLastPos = this.lastLastPos;
        this.lastLastPos = this.lastPos;
        this.lastPos = this.position.clone();

        this.velocity.add(gravity);

        this.checkAttacks();
    }

    print() {
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.strokeStyle;

        let velocity = this.velocity.clone();
        velocity.normalise();

        let pX = this.position.x;
        let pY = this.position.y;
        let vX = velocity.x * this.size;
        let vY = velocity.y * this.size;

        ctx.beginPath();
        ctx.moveTo(pX + vX, pY + vY);
        ctx.lineTo(pX - vX - vY, pY - vY + vX);
        ctx.lineTo(pX - vX + vY, pY - vY - vX);
        ctx.lineTo(pX + vX, pY + vY);
        ctx.stroke();
        ctx.fill();

        ctx.lineWidth = "4";

        let v1 = this.lastPos;
        let v2 = this.lastLastPos;
        let v3 = this.lastLastLastPos;

        ctx.beginPath();
        ctx.moveTo(pX, pY);
        ctx.bezierCurveTo(v1.x, v1.y, v2.x, v2.y, v3.x, v3.y);
        ctx.stroke();

        ctx.lineWidth = "1";
    }
}