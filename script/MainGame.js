"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
//メインのゲーム画面
var MainGame = /** @class */ (function (_super) {
    __extends(MainGame, _super);
    function MainGame(scene) {
        var _this = this;
        var tl = require("@akashic-extension/akashic-timeline");
        var timeline = new tl.Timeline(scene);
        var sizeW = 10;
        var sizeH = 8;
        var panelSize = 336 / sizeH;
        _this = _super.call(this, { scene: scene, x: 22, y: 12, width: panelSize * sizeW, height: panelSize * sizeH, touchable: true }) || this;
        var ballCnts = [];
        var comboCnt = 0;
        //外枠
        _this.append(new g.Sprite({
            scene: scene,
            x: -12,
            y: -12,
            src: scene.assets["waku"]
        }));
        //グリッド
        for (var y = 0; y < sizeH; y++) {
            for (var x = 0; x < sizeW; x++) {
                _this.append(new g.Sprite({
                    scene: scene,
                    x: x * panelSize,
                    y: y * panelSize,
                    width: panelSize,
                    height: panelSize,
                    src: scene.assets["mesh"]
                }));
            }
        }
        //実質消えたときのライン表示用
        var maps = [];
        for (var y = 0; y < sizeH; y++) {
            maps.push([]);
            for (var x = 0; x < sizeW; x++) {
                var map = new Map({
                    scene: scene,
                    x: x * panelSize,
                    y: y * panelSize,
                    width: panelSize,
                    height: panelSize
                });
                _this.append(map);
                maps[y].push(map);
            }
        }
        //ボール
        var balls = [];
        for (var i = 0; i < sizeH * sizeW; i++) {
            var ball = new Ball(scene, panelSize);
            balls.push(ball);
            _this.append(ball);
            ball.hide();
        }
        //ボールをセット
        var setBall = function () {
            var i = 0;
            for (var y = 0; y < sizeH; y++) {
                for (var x = 0; x < sizeW; x++) {
                    var map = maps[y][x];
                    if (map.num === -1 && scene.random.get(0, 10) > 2) {
                        while (!(balls[i].state & 1)) {
                            i++;
                        }
                        balls[i].show();
                        balls[i].moveTo(-50, -50);
                        balls[i].modified();
                        timeline.create(balls[i], { modified: balls[i].modified, destroyed: balls[i].destroyed })
                            .moveTo(map.x, map.y, scene.random.get(10, 300));
                        map.num = i;
                        var num = scene.random.get(0, 4);
                        balls[i].setNum(num);
                        ballCnts[num]++;
                        i++;
                    }
                }
            }
        };
        //消す処理
        var dx = [0, 1, 1, 1, 0, -1, -1, -1];
        var dy = [-1, -1, 0, 1, 1, 1, 0, -1];
        var clear = function (x, y) {
            var num = balls[maps[y][x].num].num;
            var ballCnt = 0;
            var isClear = false;
            var _loop_1 = function (i) {
                var list = [{ x: x, y: y }];
                [1, -1].forEach(function (j) {
                    var xx = x;
                    var yy = y;
                    while (true) {
                        xx += dx[i] * j;
                        yy += dy[i] * j;
                        if (xx < 0 || yy < 0 || xx >= sizeW || yy >= sizeH) {
                            break;
                        }
                        var numD = maps[yy][xx].num;
                        if (numD !== -1) {
                            if (balls[numD].num === num) {
                                if (j === 1) {
                                    list.push({ x: xx, y: yy });
                                }
                                else {
                                    list.unshift({ x: xx, y: yy });
                                }
                            }
                            else {
                                break;
                            }
                        }
                    }
                });
                //３つ以上つながっている場合
                if (list.length >= 3) {
                    isClear = true;
                    //消す処理
                    list.forEach(function (e) {
                        if (e.x !== x || e.y !== y) {
                            var ball_1 = balls[maps[e.y][e.x].num];
                            ball_1.frameNumber = ball_1.frameNumber + 6;
                            ball_1.modified();
                            timeline.create().wait(300).call(function () {
                                ball_1.hide();
                            });
                            maps[e.y][e.x].num = -1;
                            ballCnt++;
                        }
                    });
                    //消えたラインを表示する
                    var showline = function (px, py, n) {
                        timeline.create().wait(n * 20).call(function () {
                            maps[py][px].lines[i].show();
                        }).wait(250 - (n * 20)).call(function () {
                            maps[py][px].lines[i].hide();
                        });
                    };
                    //消えたラインを表示する
                    var xx = list[0].x;
                    var yy = list[0].y;
                    for (var k = 0;; k++) {
                        showline(xx, yy, k);
                        xx += dx[i];
                        yy += dy[i];
                        if (list[list.length - 1].x === xx && list[list.length - 1].y === yy) {
                            showline(xx, yy, k + 1);
                            break;
                        }
                    }
                }
            };
            for (var i = 0; i < 4; i++) {
                _loop_1(i);
            }
            if (isClear) {
                var ball_2 = balls[maps[y][x].num];
                ball_2.frameNumber = ball_2.frameNumber + 6;
                ball_2.modified();
                timeline.create().wait(250).call(function () {
                    ball_2.hide();
                });
                maps[y][x].num = -1;
                ballCnts[num] -= ballCnt + 1;
                if (!ballCnts.some(function (e) { return e > 2; })) {
                    timeline.create().wait(1000).call(function () {
                        setBall();
                        scene.playSound("se_clear");
                    });
                }
                if (ballCnts.every(function (e) { return e === 0; })) {
                    timeline.create().wait(500).call(function () {
                        scene.showZen();
                        scene.playSound("se_zen");
                    });
                }
                comboCnt++;
                scene.setRen(comboCnt);
                scene.setCombo(ballCnt + 1);
                scene.addScore((50 * ballCnt) + (10 * Math.floor(Math.pow(ballCnt + 1, 2))) + (comboCnt * 10));
                scene.playSound("se_up");
            }
            else {
                comboCnt = 0;
                scene.playSound("se_move");
            }
            return;
        };
        var pBallNum = -1;
        var bkX = 0;
        var bkY = 0;
        _this.pointDown.add(function (e) {
            if (!scene.isStart)
                return;
            var x = Math.floor(e.point.x / panelSize);
            var y = Math.floor(e.point.y / panelSize);
            pBallNum = maps[y][x].num;
            bkX = x;
            bkY = y;
        });
        _this.pointMove.add(function (e) {
            if (!scene.isStart)
                return;
            if (pBallNum === -1)
                return;
            var x = Math.floor((e.point.x + e.startDelta.x) / panelSize);
            var y = Math.floor((e.point.y + e.startDelta.y) / panelSize);
            if (x < 0 || y < 0 || x >= sizeW || y >= sizeH)
                return;
            var map = maps[y][x];
            var pBall = balls[pBallNum];
            if (map.num === -1) {
                pBall.moveTo(map.x, map.y);
                pBall.modified();
                maps[y][x].num = maps[bkY][bkX].num;
                maps[bkY][bkX].num = -1;
                bkX = x;
                bkY = y;
            }
        });
        _this.pointUp.add(function (e) {
            if (!scene.isStart)
                return;
            if (pBallNum === -1)
                return;
            clear(bkX, bkY);
        });
        //リセット
        _this.reset = function () {
            comboCnt = 0;
            ballCnts = [0, 0, 0, 0, 0, 0];
            balls.forEach(function (e) {
                e.hide();
            });
            for (var y = 0; y < sizeH; y++) {
                for (var x = 0; x < sizeW; x++) {
                    maps[y][x].num = -1;
                }
            }
            setBall();
        };
        //記号表示切り替え
        var isMark = false;
        scene.btnMark.pointDown.add(function () {
            isMark = !isMark;
            balls.forEach(function (e) {
                if (isMark) {
                    e.mark.show();
                }
                else {
                    e.mark.hide();
                }
            });
        });
        return _this;
    }
    return MainGame;
}(g.E));
exports.MainGame = MainGame;
var Map = /** @class */ (function (_super) {
    __extends(Map, _super);
    function Map(pram) {
        var _this = _super.call(this, pram) || this;
        _this.num = -1;
        _this.lines = [];
        var size = 15;
        for (var i = 0; i < 2; i++) {
            _this.lines[2 * i] = new g.FilledRect({
                scene: pram.scene,
                x: (pram.width - size) / 2,
                y: 0,
                width: size,
                height: pram.height,
                cssColor: "yellow",
                angle: 90 * i,
                opacity: 0.8
            });
            _this.append(_this.lines[2 * i]);
            var length_1 = pram.height * Math.pow(2, 0.5);
            _this.lines[2 * i + 1] = new g.FilledRect({
                scene: pram.scene,
                x: (pram.width - size) / 2,
                y: (pram.height - length_1) / 2,
                width: size,
                height: length_1,
                cssColor: "yellow",
                angle: 90 * i + 45,
                opacity: 0.8
            });
            _this.append(_this.lines[2 * i + 1]);
        }
        _this.lines.forEach(function (e) { return e.hide(); });
        return _this;
    }
    return Map;
}(g.E));
var Ball = /** @class */ (function (_super) {
    __extends(Ball, _super);
    function Ball(scene, size) {
        var _this = _super.call(this, {
            scene: scene,
            width: size,
            height: size,
            src: scene.assets["ball"],
            frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        }) || this;
        _this.num = 0;
        _this.mark = new g.FrameSprite({
            scene: scene,
            width: size,
            height: size,
            src: scene.assets["mark"],
            frames: [0, 1, 2, 3, 4, 5]
        });
        _this.mark.hide();
        _this.append(_this.mark);
        return _this;
    }
    Ball.prototype.setNum = function (num) {
        this.num = num;
        this.frameNumber = num;
        this.modified();
        if (num < 6) {
            this.mark.frameNumber = num;
            this.mark.modified();
        }
    };
    return Ball;
}(g.FrameSprite));
