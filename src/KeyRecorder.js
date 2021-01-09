class KeyRecord {
    constructor(keyName, startTime, endTime) {
        this.keyName = keyName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.offset = 0;
        this.duration = -1;
    }

    adjustTime(adjustOffset) {
        this.startTime += adjustOffset;
        this.endTime += adjustOffset;
    }

    calculate(referenceStart) {
        this.duration = this.endTime - this.startTime;
        this.offset = this.startTime - referenceStart;
    }
}

class PressTimeLine {
    constructor(keyName) {
        this.keyName = keyName;
        this.press = [];
        this.up = [];
    }

    addPress(time) {
        this.press.push(time);
    }

    addUp(time) {
        this.up.push(time);
    }

    generate() {
        if (this.press.length <= 0 || this.up.length <= 0) return null;
        if (this.press[0] > this.up[0]) this.up.splice(0, 1);
        if (this.press[this.press.length - 1] > this.up[this.up.length - 1]) this.press.splice(-1, 1);
        if (this.press.length !== this.up.length) throw "record error!";
        const krs = this.press.map((pressTime, index) => {
            return new KeyRecord(this.keyName, pressTime, this.up[index]);
        });
        return krs;
    }
}

class KeyRecorder {
    constructor(keyNames) {
        this.timeLine = [];
        this.pressTimeLines = {};
        keyNames.map((keyName) => {
            this.pressTimeLines[keyName] = new PressTimeLine(keyName);
        });
        this.checkbpm = 0;
    }

    start() {
        this.timeLine = [];
        return this;
    }

    keyPress(keyName) {
        const time = new Date().getTime();
        if (this.pressTimeLines[keyName]) this.pressTimeLines[keyName].addPress(time);
    }

    keyUp(keyName) {
        const time = new Date().getTime();
        if (this.pressTimeLines[keyName]) this.pressTimeLines[keyName].addUp(time);
    }

    combine() {
        Object.values(this.pressTimeLines).map((pressTimeLine) => {
            const newKeyRecords = pressTimeLine.generate();
            if (newKeyRecords) this.timeLine.push(...newKeyRecords);
        });
        this.timeLine.sort((a, b) => a.startTime - b.startTime);
        return this;
    }

    resetOffset(moveTime) {
        if (this.timeLine.length <= 0) return;
        if (!moveTime) moveTime = -this.timeLine[0].startTime;
        this.timeLine.map((keyRecord) => {
            keyRecord.adjustTime(moveTime);
        });
        return this;
    }

    stop() {
        this.combine();
        this.resetOffset();
        return this;
    }

    calOffset(bpm, referenceCount = 10) {
        if (this.timeLine.length <=0) throw "没有击键记录!";
        if (this.timeLine.length < referenceCount || referenceCount <= 1) referenceCount = this.timeLine.length;
        const standardDeltaTime = (bpm) ? 15000 / bpm : (this.timeLine[referenceCount - 1].startTime - this.timeLine[0].startTime) / (referenceCount - 1);
        this.checkbpm = (bpm) ? bpm: parseInt(15000 / standardDeltaTime);
        const referenceOffsets = this.timeLine.slice(0, referenceCount).map((keyRecord, index) => keyRecord.startTime - standardDeltaTime * index);
        const averageOffset = parseInt(referenceOffsets.reduce((accumulator, currentValue) => accumulator + currentValue) / referenceCount);
        this.resetOffset(-averageOffset);
        this.timeLine.map((keyRecord, index) => {
            const standardTime = standardDeltaTime * index;
            keyRecord.calculate(standardTime);
        });
        return this;
    }

    getTimeLine() {
        return this.timeLine;
    }
}

class TimeLineChart {
    constructor(timeLine) {
        this.timeLine = timeLine;
    }

    offsetChart() {
        let x = [];
        let y = [];
        this.timeLine.map((keyRecord) => {
            x.push(keyRecord.startTime);
            y.push(keyRecord.offset);
        });
        const data = { x, y, "type": "scatter" };
        const layout = {
            xaxis: { title: { text: "hit(ms)" } },
            yaxis: { title: { text: "击打误差(ms)" } }
        };
        return { data, layout };
    }

    durationChart() {
        let x = [];
        let y = [];
        this.timeLine.map((keyRecord) => {
            x.push(keyRecord.startTime);
            y.push(keyRecord.duration);
        });
        const data = { x, y, "type": "scatter" };
        const layout = {
            xaxis: { title: { text: "hit(ms)" } },
            yaxis: { title: { text: "按键时长(ms)" } }
        };
        return { data, layout };
    }

    averageBpmChart() {
        let x = [];
        let y = [];
        this.timeLine.map((keyRecord, index) => {
            x.push(keyRecord.startTime);
            const bpm = (index < 1) ? 0 : (15000 * index / (keyRecord.startTime - this.timeLine[0].startTime));
            y.push(bpm);
        });
        const data = { x, y, "type": "scatter" };
        const layout = {
            xaxis: { title: { text: "hit(ms)" } },
            yaxis: { title: { text: "平均BPM" } }
        };
        return { data, layout };
    }

    realTimeBpmChart() {
        let x = [];
        let y = [];
        this.timeLine.map((keyRecord, index) => {
            x.push(keyRecord.startTime);
            const bpm = (index < 1) ? 0 : (15000 / (keyRecord.startTime - this.timeLine[index - 1].startTime));
            y.push(bpm);
        });
        const data = { x, y, "type": "scatter" };
        const layout = {
            xaxis: { title: { text: "hit(ms)" } },
            yaxis: { title: { text: "实时BPM" } }
        };
        return { data, layout };
    }
}