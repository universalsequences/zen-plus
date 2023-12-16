/**
 * notes: when loading subpatches, we need to calculate the current max ID and add them to every single
 * object we are loading so that we can be sure that the ids dont conflict
 */

class IdGenerator {
    currentId: number;
    constructor() {
        this.currentId = 0;
    }

    next(): string {
        this.currentId += 1;
        return this.currentId.toString(36); // Convert to a base-36 string
    }

    register(id: string) {
        let num = parseInt(id, 36);
        if (num > this.currentId) {
            this.currentId = num + 1;
        }
    }

    current(): number {
        return this.currentId;
    }

    plus(id: string, num: number) {
        let parsed = parseInt(id, 36);
        let sum = parsed + num;
        let newID = sum.toString(36);
        this.register(newID);
        return newID;
    };
}

const idGenerator = new IdGenerator();
export const uuid = () => idGenerator.next();
export const registerUUID = (id: string) => idGenerator.register(id);
export const currentUUID = () => idGenerator.current();
export const plusUUID = (id: string, num: number) => idGenerator.plus(id, num);

