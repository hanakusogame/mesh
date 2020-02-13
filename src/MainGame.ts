import { MainScene } from "./MainScene";
declare function require(x: string): any;
//メインのゲーム画面
export class MainGame extends g.E {
	public reset: () => void;

	constructor(scene: MainScene) {
		const tl = require("@akashic-extension/akashic-timeline");
		const timeline = new tl.Timeline(scene);

		const sizeW = 10;
		const sizeH = 8;
		const panelSize = 336 / sizeH;

		super({ scene: scene, x: 22, y: 12, width: panelSize * sizeW, height: panelSize * sizeH, touchable: true });

		let ballCnts:number[] = [];
		let comboCnt = 0;

		//外枠
		this.append(new g.Sprite({
			scene: scene,
			x: -12,
			y: -12,
			src: scene.assets["waku"]
		}));

		//グリッド
		for (let y = 0; y < sizeH; y++) {
			for (let x = 0; x < sizeW; x++) {
				this.append(new g.Sprite({
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
		const maps: Map[][] = [];
		for (let y = 0; y < sizeH; y++) {
			maps.push([]);
			for (let x = 0; x < sizeW; x++) {
				const map = new Map({
					scene: scene,
					x: x * panelSize,
					y: y * panelSize,
					width: panelSize,
					height: panelSize
				});
				this.append(map);
				maps[y].push(map);
			}
		}

		//ボール
		const balls: Ball[] = [];
		for (let i = 0; i < sizeH * sizeW; i++) {
			const ball = new Ball(scene,panelSize);
			balls.push(ball);
			this.append(ball);
			ball.hide();
		}

		//ボールをセット
		const setBall = () => {
			let i = 0;
			for (let y = 0; y < sizeH; y++) {
				for (let x = 0; x < sizeW; x++) {
					const map = maps[y][x];
					if (map.num === -1 && scene.random.get(0, 10) > 2) {
						while (!(balls[i].state & 1)) {
							i++;
						}
						balls[i].show();
						balls[i].moveTo(-50, - 50);
						balls[i].modified();
						timeline.create(balls[i], { modified: balls[i].modified, destroyed: balls[i].destroyed })
							.moveTo(map.x, map.y, scene.random.get(10,300));
						map.num = i;
						const num = scene.random.get(0, 4);
						balls[i].setNum(num);
						ballCnts[num]++;
						i++;
					}
				}
			}
		};

		//消す処理
		const dx = [0, 1, 1, 1, 0, -1, -1, -1];
		const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
		const clear = (x: number, y: number) => {
			const num = balls[maps[y][x].num].num;
			let ballCnt = 0;
			let isClear = false;
			for (let i = 0; i < 4; i++) {
				const list: Array<{ x: number; y: number }> = [{ x: x, y: y }];
				[1, -1].forEach((j) => {
					let xx = x;
					let yy = y;
					while (true) {
						xx += dx[i] * j;
						yy += dy[i] * j;
						if (xx < 0 || yy < 0 || xx >= sizeW || yy >= sizeH) {
							break;
						}

						const numD = maps[yy][xx].num;
						if (numD !== -1) {
							if (balls[numD].num === num) {
								if (j === 1) {
									list.push({ x: xx, y: yy });
								} else {
									list.unshift({ x: xx, y: yy });
								}
							} else {
								break;
							}
						}
					}
				});

				//３つ以上つながっている場合
				if (list.length >= 3) {
					isClear = true;
					//消す処理
					list.forEach((e) => {
						if (e.x !== x || e.y !== y) {
							const ball = balls[maps[e.y][e.x].num];
							ball.frameNumber = ball.frameNumber + 6;
							ball.modified();
							timeline.create().wait(300).call(() => {
								ball.hide();
							});
							maps[e.y][e.x].num = -1;
							ballCnt++;
						}
					});

					//消えたラインを表示する
					const showline = (px: number, py: number, n:number) => {
						timeline.create().wait(n * 20).call(() => {
							maps[py][px].lines[i].show();
						}).wait(250 - (n*20)).call(() => {
							maps[py][px].lines[i].hide();
						});
					};

					//消えたラインを表示する
					let xx = list[0].x;
					let yy = list[0].y;
					for (let k = 0; ; k++) {
						showline(xx, yy,k);
						xx += dx[i];
						yy += dy[i];
						if (list[list.length - 1].x === xx && list[list.length - 1].y === yy) {
							showline(xx, yy, k+1);
							break;
						}
					}
				}
			}

			if (isClear) {
				const ball = balls[maps[y][x].num];
				ball.frameNumber = ball.frameNumber + 6;
				ball.modified();
				timeline.create().wait(250).call(() => {
					ball.hide();
				});
				maps[y][x].num = -1;
				ballCnts[num] -= ballCnt + 1;

				if (!ballCnts.some((e) => e > 2)) {
					timeline.create().wait(1000).call(() => {
						setBall();
						scene.playSound("se_clear");
					});
				}

				if (ballCnts.every((e) => e === 0)) {
					timeline.create().wait(500).call(() => {
						scene.showZen();
						scene.playSound("se_zen");
					});
				}
				comboCnt++;
				scene.setRen(comboCnt);
				scene.setCombo(ballCnt + 1);
				scene.addScore((50 * ballCnt) + (10 * Math.floor(Math.pow(ballCnt + 1, 2))) + (comboCnt * 10));
				scene.playSound("se_up");
			} else {
				comboCnt = 0;
				scene.playSound("se_move");
			}

			return;
		};

		let pBallNum: number = -1;
		let bkX = 0;
		let bkY = 0;

		this.pointDown.add((e) => {
			if (!scene.isStart) return;
			const x = Math.floor(e.point.x / panelSize);
			const y = Math.floor(e.point.y / panelSize);
			pBallNum = maps[y][x].num;
			bkX = x;
			bkY = y;
		});

		this.pointMove.add((e) => {
			if (!scene.isStart) return;
			if (pBallNum === -1) return;
			const x = Math.floor((e.point.x + e.startDelta.x) / panelSize);
			const y = Math.floor((e.point.y + e.startDelta.y) / panelSize);
			if (x < 0 || y < 0 || x >= sizeW || y >= sizeH) return;
			const map = maps[y][x];
			const pBall = balls[pBallNum];
			if (map.num === -1) {
				pBall.moveTo(map.x, map.y);
				pBall.modified();
				maps[y][x].num = maps[bkY][bkX].num;
				maps[bkY][bkX].num = -1;
				bkX = x;
				bkY = y;
			}
		});

		this.pointUp.add((e) => {
			if (!scene.isStart) return;
			if (pBallNum === -1) return;
			clear(bkX, bkY);
		});

		//リセット
		this.reset = () => {
			comboCnt = 0;
			ballCnts = [0, 0, 0, 0, 0, 0];
			balls.forEach((e) => {
				e.hide();
			});
			for (let y = 0; y < sizeH; y++) {
				for (let x = 0; x < sizeW; x++) {
					maps[y][x].num = -1;
				}
			}
			setBall();
		};

		//記号表示切り替え
		let isMark = false;
		scene.btnMark.pointDown.add(() => {
			isMark = !isMark;
			balls.forEach((e) => {
				if (isMark) {
					e.mark.show();
				} else {
					e.mark.hide();
				}
			});
		});
	}
}

class Map extends g.E {
	public num: number = -1;

	public lines: g.FilledRect[] = [];

	constructor(pram: g.EParameterObject) {
		super(pram);

		const size = 15;
		for (let i = 0; i < 2; i++) {
			this.lines[2 * i] = new g.FilledRect({
				scene: pram.scene,
				x: (pram.width - size) / 2,
				y: 0,
				width: size,
				height: pram.height,
				cssColor: "yellow",
				angle: 90 * i,
				opacity:0.8
			});
			this.append(this.lines[2 * i]);

			const length = pram.height * Math.pow(2, 0.5);
			this.lines[2 * i + 1] = new g.FilledRect({
				scene: pram.scene,
				x: (pram.width - size) / 2,
				y: (pram.height - length) / 2,
				width: size,
				height: length,
				cssColor: "yellow",
				angle: 90 * i + 45,
				opacity:0.8
			});
			this.append(this.lines[2 * i + 1]);
		}
		this.lines.forEach((e) => e.hide());
	}
}

class Ball extends g.FrameSprite {
	public num: number = 0;

	public mark: g.FrameSprite;

	constructor(scene:g.Scene,size:number) {
		super({
			scene: scene,
			width: size,
			height: size,
			src: scene.assets["ball"] as g.ImageAsset,
			frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
		});

		this.mark = new g.FrameSprite({
			scene: scene,
			width: size,
			height: size,
			src: scene.assets["mark"] as g.ImageAsset,
			frames: [0, 1, 2, 3, 4, 5]
		});
		this.mark.hide();

		this.append(this.mark);
	}

	public setNum(num: number) {
		this.num = num;
		this.frameNumber = num;
		this.modified();

		if (num < 6) {
			this.mark.frameNumber = num;
			this.mark.modified();
		}
	}
}
