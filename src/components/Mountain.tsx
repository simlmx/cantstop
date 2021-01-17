import React, { useMemo } from "react";
import { getNumStepsForSum } from "../math";
import {
  PlayerID,
  SumOption,
  PlayerInfo,
  MountainShape,
  SameSpace,
} from "../types";
import Chicken from "./Chicken";
import { NUM_STEPS } from "../constants";
import { climbOneStep } from "../Game";

export const Climber = (props: {
  color?: number;
  current?: boolean;
  highlight?: boolean;
  downlight?: boolean;
}) => {
  let className = "climber";
  if (!props.current) {
    className += ` bgcolor${props.color}`;
  } else {
    className += ` climberCurrent border${props.color}`;
  }
  if (props.highlight) {
    className += " highlight";
  } else if (props.downlight) {
    className += " downlight";
  }
  return <span {...{ className }}></span>;
};

interface ClimberPlaceholderProps {
  color?: number;
  top?: boolean;
  bottom?: boolean;
  side?: boolean;
}

export const ClimberPlaceholder = ({
  color,
  top,
  bottom,
  side,
}: ClimberPlaceholderProps) => {
  let className = "colFg colFgMiddle";
  let wrapClass = "colBg";

  if (top) {
    wrapClass += " colBgTop";
  } else if (bottom) {
    wrapClass += " colBgBottom";
  }

  if (color != null) {
    className += ` bgcolor${color}`;
    wrapClass += ` bgcolor${color}alpha40`;
  } else {
    className += " colFgNotBlocked";
    if (!side) {
      wrapClass += " colBgNotBlocked";
    }
  }

  return (
    <div className={wrapClass}>
      <div {...{ className }}></div>
    </div>
  );
};

export const ColNum = (props: {
  colNum: number;
  blockedColor?: number;
  top?: boolean;
}) => {
  // Below row 0 we write the dice sum.
  const { colNum, blockedColor, top } = props;

  let wrapClassName = "colBg";
  let className = "";
  let chickenClass = "";

  if (top) {
    className += " colFgTop";
    wrapClassName += " colBgTop";
    chickenClass = "topChicken";
  } else {
    className += " colFgBottom";
    wrapClassName += " colBgBottom";
  }
  if (blockedColor != null) {
    className += ` bgcolor${blockedColor}`;
    wrapClassName += ` bgcolor${blockedColor} bgcolor${blockedColor}alpha40`;
    chickenClass += ` chickenColor${blockedColor}`;
  } else {
    className += " colFgNotBlocked";
    wrapClassName += " colBgNotBlocked";
  }

  if (colNum >= 10) {
    className += " twoDigits";
  }

  return (
    <div className={wrapClassName}>
      {top && (
        <div className={chickenClass}>
          <Chicken />
        </div>
      )}
      <div {...{ className }} key={0}>
        {colNum}
      </div>
    </div>
  );
};

interface MountainProps {
  currentPositions: { [key: number]: number };
  checkpointPositions: { [key: string]: { [key: number]: number } };
  playerInfos: { [key: string]: PlayerInfo };
  blockedSums: { [key: number]: string };
  currentPlayer: PlayerID;
  diceSumOptions?: SumOption[];
  mouseOverPossibility?: { diceSplit: number; dicePairs: number[] };
  mountainShape: MountainShape;
  sameSpace: SameSpace;
  // Those options were introduced to be used in the How To Play seciton.
  // It's useful to show a subset of the Mountain.
  minCol?: number;
  maxCol?: number;
  minRow?: number;
  maxRow?: number;
}

interface MountainCell {
  element?: JSX.Element;
  climbers: JSX.Element[];
  current?: JSX.Element;
}

export const Mountain = (props: MountainProps) => {
  const {
    mouseOverPossibility,
    diceSumOptions,
    checkpointPositions,
    currentPlayer,
    currentPositions,
    playerInfos,
    blockedSums,
    mountainShape,
    sameSpace,
  } = props;

  const maxSteps = NUM_STEPS[mountainShape][7];

  // First we need to copy the prop.
  const updatedCurrentPositions: typeof currentPositions = {};
  Object.assign(updatedCurrentPositions, currentPositions);

  const minCol = props?.minCol || 2;
  const maxCol = props?.maxCol || 12;
  const minRow = props?.minRow || 1;
  const maxRow = props?.maxRow || maxSteps;

  const numCols = maxCol - minCol + 1;
  const numRows = maxRow - minRow + 1;

  // Build a matrix of components for the parts of the mountain that don't change in a
  // given turn. This is everything but the checkpoints. We memoize that part for faster
  // re-render.

  let elMatrix: MountainCell[][] = useMemo(() => {
    const elMatrix: MountainCell[][] = Array(numRows)
      .fill(undefined)
      .map(() =>
        Array(numCols)
          .fill(undefined)
          .map(() => {
            return { climbers: [] };
          })
      );

    for (let j = 0; j < numCols; ++j) {
      const col = j + minCol;

      const blockedBy = blockedSums[col];

      // Bottom of column.
      elMatrix[0][j].element = (
        <ColNum
          colNum={col}
          top={false}
          blockedColor={playerInfos[blockedBy]?.color}
        />
      );

      const topIndex = getNumStepsForSum(col, mountainShape) - 1;

      if (topIndex <= maxRow && topIndex >= minRow) {
        // Top of column.
        elMatrix[topIndex][j].element = (
          <ColNum
            colNum={col}
            top={true}
            blockedColor={playerInfos[blockedBy]?.color}
          />
        );
      }

      // Everything between the bottom and the top of the column.
      for (let i = 1; i < Math.min(topIndex, maxRow); ++i) {
        elMatrix[i][j].element = (
          <ClimberPlaceholder color={playerInfos[blockedBy]?.color} />
        );
      }
    }

    // Add the checkpoint climbers.
    Object.entries(checkpointPositions).forEach(([playerID, positions]) => {
      Object.entries(positions).forEach(([diceSumStr, numSteps]) => {
        const diceSum = parseInt(diceSumStr);
        if (
          diceSum < minCol ||
          diceSum > maxCol ||
          numSteps < minRow ||
          numSteps > maxRow
        ) {
          return;
        }
        elMatrix[numSteps - minRow][diceSum - minCol].climbers.push(
          <Climber color={playerInfos[playerID].color} key={playerID} />
        );
      });
    });

    return elMatrix;
  }, [
    checkpointPositions,
    playerInfos,
    blockedSums,
    maxCol,
    minCol,
    maxRow,
    minRow,
    numCols,
    numRows,
    mountainShape,
  ]);

  // Add the current tokens, i.e. what changes often.
  //

  // If we want to highlight, we'll compute where the new positions will be!
  let highlightSums: number[] = [];
  if (mouseOverPossibility != null && diceSumOptions != null) {
    const { diceSplit, dicePairs } = mouseOverPossibility;

    const diceSumOption = diceSumOptions[diceSplit];
    highlightSums = dicePairs
      .map((i) => diceSumOption.diceSums[i])
      .filter((x) => x != null) as number[];

    highlightSums.forEach((sum) => {
      const newStep = climbOneStep(
        updatedCurrentPositions,
        checkpointPositions,
        sum,
        currentPlayer,
        sameSpace
      );
      updatedCurrentPositions[sum] = newStep;
    });
  }

  const currentElements: JSX.Element[][] = Array(numRows)
    .fill(undefined)
    .map(() => Array(numCols).fill(undefined));

  // Left tokens in the top right.
  // Only do those for full mountains.
  if (numRows === maxSteps && numCols === 11) {
    const numLeft = 3 - Object.keys(currentPositions).length;
    const numLeftAfterUpdate = 3 - Object.keys(updatedCurrentPositions).length;
    for (let i = 0; i < 3; ++i) {
      const col = numCols - 1;
      const row = numRows - 1 - i;

      let el: JSX.Element;
      if (numLeftAfterUpdate > i) {
        el = (
          <Climber
            key={-1}
            current={true}
            color={playerInfos[currentPlayer].color}
          />
        );
      } else if (numLeft > i) {
        el = (
          <Climber
            key={-1}
            current={true}
            color={playerInfos[currentPlayer].color}
            downlight={true}
          />
        );
      } else {
        el = <ClimberPlaceholder key={0} side={true} />;
      }

      currentElements[row][col] = el;
    }

    // Downlighted current climbers.
    Object.entries(currentPositions).forEach(([colStr, step]) => {
      if (updatedCurrentPositions[colStr] === step) {
        return;
      }
      const col = parseInt(colStr);
      currentElements[step - 1][col - 2] = (
        <Climber
          key={-1}
          current={true}
          color={playerInfos[currentPlayer].color}
          downlight={true}
        />
      );
    });
  }

  // Highlighted current climbers.
  Object.entries(updatedCurrentPositions).forEach(([colStr, row]) => {
    const col = parseInt(colStr);

    if (col < minCol || col > maxCol || row < minRow || row > maxRow) {
      return;
    }

    currentElements[row - minRow][col - minCol] = (
      <Climber
        key={-1}
        current={true}
        color={playerInfos[currentPlayer].color}
        highlight={true}
      />
    );
  });

  // Draw the whole thing.
  const content = elMatrix
    .slice()
    .reverse()
    .map((row, i) => {
      return (
        <div className="mountainRow" key={i}>
          {row.map((col, j) => {
            let climbers = col.climbers;
            if (currentElements[numRows - i - 1][j] != null) {
              climbers = [...climbers, currentElements[numRows - i - 1][j]];
            }
            return (
              <div className="mountainCell" key={j}>
                <div className="colBgWrap" key={j}>
                  {col.element}
                  <div className="climberGroup" key={1}>
                    {climbers}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });

  return <div className={`mountain ${mountainShape}Mountain`}>{content}</div>;
};
