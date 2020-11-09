import React from "react";

import { DiceBoard } from "./DiceBoard";
import { Mountain } from "./Mountain";
import { ScoreBoard } from "./ScoreBoard";
import GameSetup from "./GameSetup";
import MoveButtons from "./MoveButtons";
import { DICE_INDICES } from "../math";
import { GameType } from "../Game";
import { PlayerID } from "../types";
import { DieLogo } from "./Die";
import { OddsCalculator } from "../math/probs";

interface CantStopBoardState {
  // diceSplit: 0=horizontal, 1=vertical, 2=diagonal
  // dicePairs : Which of the pairs []: None, [0]: only the first?, [1]: only the second, [0, 1]:
  // both of then.
  // diceSums: The actual sums of the pairs.
  mouseOverPossibility?: { diceSplit: number; dicePairs: number[] };
}

interface CantStopBoardProps {
  G: GameType;
  playerID: PlayerID;
  matchID: string;
  ctx: any;
  moves: any;
  log: any;
  isActive: boolean;
  isConnected: boolean;
  plugins: any;
  _undo: any;
  _redo: any;
  _stateID: any;
  events: any;
  reset: any;
  undo: any;
  redo: any;
  isMultiplayer: boolean;
}

export class Info extends React.Component<{
  info?: { code: string; playerID?: PlayerID };
  lastAllowedColumns: number[];
}> {
  oddsCalculator: OddsCalculator;

  constructor(props) {
    super(props);
    this.oddsCalculator = new OddsCalculator();
  }

  getProbBust(): string {
    const { lastAllowedColumns } = this.props;
    const prob = this.oddsCalculator.oddsBust(lastAllowedColumns);
    const probStr = (Math.round(prob * 1000) / 10).toFixed(1);
    return probStr;
  }

  renderContent(): {
    msg: string | JSX.Element;
    level?: "danger" | "success";
  } {
    if (this.props?.info == null) {
      return { msg: "", level: undefined };
    }

    const { info } = this.props;

    // We compute it without needing it sometimes. Maybe a `switch` is a bad idea!
    const prob = this.getProbBust();
    const probMsg = (
      <span className="small" title={`The probability of busting was ${prob}%`}>
        Prob of bust was {prob}%
      </span>
    );
    switch (info.code) {
      case "bust":
        return {
          msg: (
            <span>
              <strong>{info.playerID}</strong> busted!
              <br />
              {probMsg}.
            </span>
          ),
          level: "danger",
        };
      case "stop":
        return {
          msg: (
            <span>
              <strong>{info.playerID}</strong> ended their turn.
              <br />
              {probMsg}
            </span>
          ),
          level: "success",
        };
      case "win":
        return {
          msg: (
            <span>
              <strong>{info.playerID}</strong> won!{" "}
              <span role="img" aria-label="party">
                🎉
              </span>
            </span>
          ),
          level: "success",
        };
      case "goodgame":
        return {
          msg: "Good game!",
          level: "success",
        };
      default:
        return { msg: "", level: undefined };
    }
  }

  render() {
    const { msg, level } = this.renderContent();
    const className = `alert alert-${level} text-center info`;
    return (
      <div {...{ className }} role="alert">
        <a href="/" title="Home" className="homeLink">
          <DieLogo />
        </a>
        <div className="message">{msg}</div>
      </div>
    );
  }
}

export class CantStopBoard extends React.Component<
  CantStopBoardProps,
  CantStopBoardState
> {
  constructor(props) {
    super(props);
    this.state = {
      mouseOverPossibility: undefined,
    };
  }
  render() {
    const { moves, matchID, ctx, G } = this.props;
    const {
      checkpointPositions,
      currentPositions,
      blockedSums,
      diceSumOptions,
      playerNames,
      diceValues,
      scores,
      numVictories,
      info,
      lastAllowedColumns,
    } = G;
    const { currentPlayer, phase, numPlayers, playOrder } = ctx;
    const { mouseOverPossibility } = this.state;

    const playerID = G.passAndPlay ? currentPlayer : this.props.playerID;

    if (phase === "setup") {
      return (
        <GameSetup
          {...{
            playerNames,
            playerID,
            moves,
            maxNumPlayers: numPlayers,
            matchID,
          }}
        />
      );
    }

    // Highlight or not for each die.
    let diceHighlight: boolean[] = Array(4).fill(false);
    let diceSplit: number | undefined = undefined;
    if (this.state.mouseOverPossibility != null) {
      diceSplit = this.state.mouseOverPossibility.diceSplit;
      const { dicePairs } = this.state.mouseOverPossibility;

      const splitIndices: number[][] = DICE_INDICES[diceSplit];

      dicePairs.forEach((pairIndex, i) => {
        splitIndices[pairIndex].forEach((diceIndex) => {
          diceHighlight[diceIndex] = true;
        });
      });
    }

    const mountain = (
      <Mountain
        {...{
          checkpointPositions,
          currentPositions,
          blockedSums,
          currentPlayer,
          diceSumOptions,
          mouseOverPossibility,
        }}
      />
    );

    const scoreBoard = (
      <ScoreBoard
        {...{
          scores,
          playerNames,
          currentPlayer,
          playOrder,
          numVictories,
        }}
      />
    );

    const diceBoard = (
      <DiceBoard {...{ diceValues, currentPlayer, diceHighlight, diceSplit }} />
    );

    const buttons =
      this.props.ctx.phase === "gameover" ? (
        <div className="playAgainWrap">
          <button
            onClick={() => this.props.moves.playAgain()}
            className={`btn btnAction bgcolor${this.props.ctx.currentPlayer}`}
          >
            Play
            <br />
            Again!
          </button>
        </div>
      ) : (
        <MoveButtons
          {...{ moves, ctx, G, playerID }}
          onMouseEnter={(diceSplit, dicePairs) =>
            this.setState({
              mouseOverPossibility: { diceSplit, dicePairs },
            })
          }
          onMouseLeave={() => {
            this.setState({ mouseOverPossibility: undefined });
          }}
        />
      );

    // We use 3x2 placeholder buttons to make sure the <div> containing them stays the
    // same dimensions. We need them disabled to prevent the mouse changing on mouse
    // over (it happens even if they have dimensions 0x? or ?x0). We also need to make
    // them invisible to prevent some weird click behviour for the buttons next to it.
    const fakeButtons = (
      <div className="fakeButtons">
        <div>
          <button
            className="btn btn-success fakeButton btnAction invisible"
            disabled
          >
            1
          </button>
        </div>
        <div>
          <button
            className="btn btn-success fakeButton btnAction invisible"
            disabled
          >
            1
          </button>
        </div>
        <div>
          <button
            className="btn btn-success fakeButton btnAction invisible"
            disabled
          >
            1
          </button>
        </div>
      </div>
    );

    const fakeButtonsInside = (
      <div className="fakeButtonInsideWrap">
        <button className="btn btnAction fakeButtonInside invisible" disabled>
          11
        </button>
        <button className="btn btnAction fakeButtonInside invisible" disabled>
          12
        </button>
      </div>
    );

    // The onClick is necessary to disable the double-click zoom on ios.
    // See stackoverflow.com/a/54753520/1067132
    return (
      <div className="cantStopBoard" onClick={() => {}}>
        <Info {...{ info, lastAllowedColumns }} />
        <div className="megaWrap">
          <div className="bigHspace"></div>
          <div className="boardContent">
            <div className="bandBegin"></div>
            <div className="mountainWrap">
              {/* First column: the mountain. */}
              {mountain}
            </div>
            <div className="bandMiddle"></div>
            {/* Second column: dice / actions / score board */}
            <div className="rightWrap">
              {scoreBoard}
              {/* Section with Dice and Buttons */}
              <div className="diceButtons">
                <div className="diceButtonsBefore"></div>
                {/* Dice */}
                {diceBoard}
                <div className="diceButtonsMiddle"></div>
                {/* Buttons */}
                <div className="fakeButtonsWrap">
                  {/* We insert fake transparent buttons with 0 width xor height as placeholders to make sure the container stays the same size */}
                  {fakeButtons}
                  <div className="buttonsWrap">
                    {fakeButtonsInside}
                    {buttons}
                  </div>
                </div>
                <div className="diceButtonsBefore"></div>
              </div>
            </div>
            <div className="bandEnd"></div>
          </div>
          <div className="bigHspace"></div>
        </div>
      </div>
    );
  }
}
