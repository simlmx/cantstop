import React from "react";
import { sumSteps } from "../math";
import { PlayerID } from "../types";

const Climber = (props: { playerID?: PlayerID }) => {
  const opts = { className: "climber" };
  if (props.playerID != null) {
    opts.className += ` color${props.playerID}`;
  }
  return <div {...opts}>• </div>;
};

const ClimberPlaceholder = (props: { playerID?: PlayerID }) => {
  const opts = { className: "climberPlaceholder" };
  if (props.playerID != null) {
    opts.className += `color${props.playerID}`;
  }
  return (
    <div className="climberPlaceholderWrap">
      <div {...opts}>〇</div>
    </div>
  );
};

interface MountainProps {
  currentPositions: { [key: number]: number };
  checkpointPositions: object;
  blockedSums: { [key: number]: string };
}

export class Mountain extends React.Component<MountainProps> {
  render() {
    let rows: JSX.Element[] = [];
    for (let row = 13; row >= 0; --row) {
      let cols: any[] = [];
      for (let col = 2; col < 13; ++col) {
        let content: JSX.Element | string | (JSX.Element | string)[];

        const totalNumSteps = sumSteps(col);
        const currentIsThere = this.props.currentPositions[col] === row;
        const blockedBy = this.props.blockedSums[col];

        let climbers: JSX.Element[] = [];

        if (row === 0 || row === totalNumSteps) {
          // Below row 0 we write the dice sum.
          const opts = { className: "badge badge-dark colNumbers" };
          if (blockedBy != null) {
            opts.className += ` bgcolor${blockedBy}`;
          }
          content = (
            <div {...opts} key={0}>
              {col}
            </div>
          );
        } else if (row < totalNumSteps) {
          const opts = { className: "climberPlaceholder" };
          if (blockedBy != null) {
            opts.className += ` color${blockedBy}`;
          }
          content = (
            <ClimberPlaceholder
              playerID={blockedBy == null ? undefined : blockedBy}
              key={0}
            />
          );
        } else if ([13, 12, 11].includes(row) && col === 2) {
          // We place the left climbers in the top left of the table.
          const numClimbersLeft =
            3 - Object.keys(this.props.currentPositions).length;
          content = <ClimberPlaceholder key={0} />;
          if (row >= 14 - numClimbersLeft) {
            climbers.push(<Climber key={-1} />);
          }
        } else {
          content = "";
        }

        // It's not efficient to do this every time by... javascript :shrug:
        Object.entries(this.props.checkpointPositions).forEach(
          ([playerID, positions]) => {
            Object.entries(positions).forEach(([diceSumStr, numSteps]) => {
              const diceSum = parseInt(diceSumStr);
              if (diceSum === col && numSteps === row) {
                climbers.push(<Climber playerID={playerID} key={playerID} />);
              }
            });
          }
        );

        if (currentIsThere) {
          climbers.push(<Climber key={-1} />);
        }

        if (climbers.length > 0) {
          content = (
            <div className="mountainCell">
              <div className="climberGroupBackground">{content}</div>
              <div className="climberGroup" key={1}>
                {climbers}
              </div>
            </div>
          );
        } else {
          content = <div className="mountainCell"> {content} </div>;
        }

        cols.push(
          <td key={col} className="mountainCol">
            {content}
          </td>
        );
      }
      rows.push(<tr key={row}>{cols}</tr>);
    }

    return (
      <table className="table table-sm table-borderless mountain">
        <tbody>{rows}</tbody>
      </table>
    );
  }
}
