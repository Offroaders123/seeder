export class QueueManager {
    /**
     * @param {string} path
     * @param {number} [numberOfWorkers]
     */
    constructor(path, numberOfWorkers) {
        this.path = path;
        this.numberOfWorkers = numberOfWorkers ?? navigator.hardwareConcurrency ?? 1;
        /** @type {(Worker & { name: string; busy: boolean; callback: (seed: string) => void; })[]} */
        this.workers = [];
        this.workerCounter = 0;
        this.COLORS = null;
        /** @type {Record<string, unknown>} */
        this.drawCache = {};
        this.seedUpdateCallback = null;
        this._spawnWorkers();
        this.getColors();
    }

    /**
     * @param {string} mcVersion
     * @param {string} seed
     * @param {string} startX
     * @param {string} startY
     * @param {string} widthX
     * @param {string} widthY
     * @param {string} dimension
     * @param {string} yHeight
     * @returns {string}
     */
    getCacheKey(mcVersion, seed, startX, startY, widthX, widthY, dimension, yHeight) {
        return mcVersion + "-" + seed + "-" + startX + "-" + startY + "-" + widthX + "-" + widthY + "-" + dimension + "-" + yHeight;
    }

    /**
     * @param {string} mcVersion
     * @param {string} seed
     * @param {string} startX
     * @param {string} startY
     * @param {string} widthX
     * @param {string} widthY
     * @param {string} dimension
     * @param {string} yHeight
     * @param {(colors: typeof this.drawCache[number]) => void} callback
     * @returns {void}
     */
    draw(mcVersion, seed, startX, startY, widthX, widthY, dimension, yHeight, callback, force = false) {
        if (!force) {
            const cacheKey = this.getCacheKey(mcVersion, seed, startX, startY, widthX, widthY, dimension, yHeight);
            const cachedColors = this.drawCache[cacheKey];
            if (cachedColors) {
                callback(cachedColors);
                return;
            }
        }
        for (let worker of this.workers) {
            if (!worker.busy) {
                worker.busy = true;
                worker.callback = callback;
                worker.postMessage({
                    kind: "GET_AREA",
                    data: { mcVersion, seed, startX, startY, widthX, widthY, dimension, yHeight }
                });
                return;
            }
        }
        setTimeout(() => this.draw(mcVersion, seed, startX, startY, widthX, widthY, dimension, yHeight, callback, true), 1);
    }

    /**
     * @param {string} mcVersion
     * @param {string[]} biomes
     * @param {number} x
     * @param {number} z
     * @param {number} widthX
     * @param {number} widthZ
     * @param {number} startingSeed
     * @param {number} dimension
     * @param {number} yHeight
     * @param {number} threads
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    findBiomes(mcVersion, biomes, x, z, widthX, widthZ, startingSeed, dimension, yHeight, threads, callback) {
        startingSeed = startingSeed ?? 0;
        for (let worker of this.workers) {
            if (!worker.busy && threads !== 0) {
                worker.busy = true;
                worker.callback = (seed) => {
                    for (const worker of this.workers) {
                        worker.terminate();
                    }
                    this.workers = [];
                    this._spawnWorkers();
                    callback(seed);
                };
                worker.postMessage({
                    kind: "GET_BIOMES",
                    data: { mcVersion, biomes, x, z, widthX, widthZ, startingSeed, dimension, yHeight }
                });
                startingSeed += 1000000;
                threads--;
            }
        }
    }

    /**
     * @param {string} mcVersion
     * @param {string} seed
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    findSpawn(mcVersion, seed, callback) {
        for (let worker of this.workers) {
            if (!worker.busy) {
                worker.busy = true;
                worker.callback = callback;
                worker.postMessage({
                    kind: "GET_SPAWN",
                    data: { mcVersion, seed }
                });
                return;
            }
        }
        setTimeout(() => this.findSpawn(mcVersion, seed, callback), 1);
    }

    /**
     * @param {string} mcVersion
     * @param {string} seed
     * @param {number} howMany
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    findStrongholds(mcVersion, seed, howMany, callback) {
        for (let worker of this.workers) {
            if (!worker.busy) {
                worker.busy = true;
                worker.callback = callback;
                worker.postMessage({
                    kind: "GET_STRONGHOLDS",
                    data: { mcVersion, seed, howMany }
                });
                return;
            }
        }
        setTimeout(() => this.findStrongholds(mcVersion, seed, howMany, callback), 1);
    }

    /**
     * @param {string} mcVersion
     * @param {string} structType
     * @param {number} x
     * @param {number} z
     * @param {number} range
     * @param {number} startingSeed
     * @param {number} dimension
     * @param {number} threads
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    findStructures(mcVersion, structType, x, z, range, startingSeed, dimension, threads, callback) {
        startingSeed = startingSeed ?? 0;
        for (let worker of this.workers) {
            if (!worker.busy && threads !== 0) {
                worker.busy = true;
                worker.callback = (seed) => {
                    for (const worker of this.workers) {
                        worker.terminate();
                    }
                    this.workers = [];
                    this._spawnWorkers();
                    callback(seed);
                };
                worker.postMessage({
                    kind: "FIND_STRUCTURES",
                    data: { mcVersion, structType, x, z, range, startingSeed, dimension }
                });
                startingSeed += 1000000;
                threads--;
            }
        }
    }

    /**
     * @param {string} mcVersion
     * @param {string} structType
     * @param {string[]} biomes
     * @param {number} x
     * @param {number} z
     * @param {number} range
     * @param {number} startingSeed
     * @param {number} dimension
     * @param {number} yHeight
     * @param {number} threads
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    findBiomesWithStructures(mcVersion, structType, biomes, x, z, range, startingSeed, dimension, yHeight, threads, callback) {
        startingSeed = startingSeed ?? 0;
        for (let worker of this.workers) {
            if (!worker.busy && threads !== 0) {
                worker.busy = true;
                worker.callback = (seed) => {
                    for (const worker of this.workers) {
                        worker.terminate();
                    }
                    this.workers = [];
                    this._spawnWorkers();
                    callback(seed);
                };
                worker.postMessage({
                    kind: "GET_BIOMES_WITH_STRUCTURES",
                    data: { mcVersion, structType, biomes, x, z, range, startingSeed, dimension, yHeight }
                });
                startingSeed += 1000000;
                threads--;
            }
        }
    }

    /**
     * @param {string} mcVersion
     * @param {string} structType
     * @param {string} seed
     * @param {number} regionsRange
     * @param {number} dimension
     * @param {(seed: string) => void} callback
     * @returns {void}
     */
    getStructuresInRegions(mcVersion, structType, seed, regionsRange, dimension, callback) {
        for (let worker of this.workers) {
            if (!worker.busy) {
                worker.busy = true;
                worker.callback = callback;
                worker.postMessage({
                    kind: "GET_STRUCTURES_IN_REGIONS",
                    data: { mcVersion, structType, seed, regionsRange, dimension }
                });
                return;
            }
        }
        setTimeout(() => this.getStructuresInRegions(mcVersion, structType, seed, regionsRange, dimension, callback), 1);
    }

    /**
     * @returns {void}
     */
    getColors() {
        for (let worker of this.workers) {
            if (!worker.busy) {
                worker.busy = true;
                worker.postMessage({
                    kind: "GET_COLORS",
                });
                return;
            }
        }
        setTimeout(() => this.getColors(), 1);
    }

    /**
     * @returns {void}
     */
    printStatus() {
        console.log("Total workers: " + this.workers.length + " -  Busy: " + this.workers.filter(w => w.busy).length);
    }

    /**
     * @returns {void}
     */
    killAll() {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
    }

    /**
     * @returns {void}
     */
    restartAll() {
        this.killAll();
        this._spawnWorkers();
    }

    /**
     * @returns {void}
     */
    _spawnWorkers() {
        for (let i = 0; i < this.numberOfWorkers; i++) {
            this._spawnWorker((w) => {
                this.workers.push(w);
            });
        }
    }

    /**
     * @param {(worker: typeof this.workers[number]) => void} callback
     * @returns {void}
     */
    _spawnWorker(callback) {
        const worker = /** @type {typeof this.workers[number]} */ (new Worker(this.path));
        worker.name = "Worker_" + this.workerCounter++;
        worker.busy = true;
        worker.addEventListener('message', (e) => this._commonListener(e, worker, callback));
    }

    /**
     * Types not completed yet for worker messages passing. Currently typed as 'unknown'.
     * 
     * @param {MessageEvent<unknown>} e
     * @param {typeof this.workers[number]} worker
     * @param {(worker: (typeof this.workers)[number]) => void} callback
     * @returns {void}
     */
    _commonListener(e, worker, callback) {
        if (e.data.kind === "DONE_LOADING") {
            worker.busy = false;
            callback(worker);
        }
        else if (e.data.kind === "DONE_GET_AREA") {
            const data = e.data.data;
            const cacheKey = this.getCacheKey(data.mcVersion, data.seed, data.startX, data.startY, data.widthX, data.widthY, data.dimension, data.yHeight);
            this.drawCache[cacheKey] = data.colors;
            worker.callback(data.colors);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_BIOMES") {
            const data = e.data.data;
            worker.callback(data.seed);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_SPAWN") {
            const data = e.data.data;
            worker.callback(data.x, data.z);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_STRONGHOLDS") {
            const data = e.data.data;
            worker.callback(data);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_FIND_STRUCTURES") {
            const data = e.data.data;
            worker.callback(data.seed);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_BIOMES_WITH_STRUCTURES") {
            const data = e.data.data;
            worker.callback(data.seed);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_STRUCTURES_IN_REGIONS") {
            const data = e.data.data;
            worker.callback(data);
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "DONE_GET_COLORS") {
            const data = e.data.data;
            this.COLORS = data.colors;
            this._cleanWorker(worker);
        }
        else if (e.data.kind === "SEED_UPDATE") {
            if (this.seedUpdateCallback) {
                this.seedUpdateCallback();
            }
        }
    }

    /**
     * @param {typeof this.workers[number]} worker
     * @returns {void}
     */
    _cleanWorker(worker) {
        worker.callback = null;
        worker.busy = false;
    }
}