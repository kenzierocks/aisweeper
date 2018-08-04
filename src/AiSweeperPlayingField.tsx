import React from "react";
import {MineField} from "./MineField";
import {MINE_FIELD} from "./Ai";
import {FxPropListener} from "./fxprops/FxProp";
import {AiSweeperCell} from "./AiSweeperCell";
import {Col, Row} from "reactstrap";

export interface MineSweeperPlayingFieldProps {
    field: MineField
}

export const MineSweeperPlayingField: React.SFC<MineSweeperPlayingFieldProps> = ({field}) => {
    const rows = [];
    for (let i = 0; i < field.width; i++) {
        const col = [];
        for (let j = 0; j < field.height; j++) {
            col.push(<Col key={"col#" + j} xs>
                <AiSweeperCell cell={field.get({x: i, y: j})}/>
            </Col>);
        }
        rows.push(<Row key={"row#" + i} noGutters className="flex-nowrap">
            {col}
        </Row>);
    }
    return <div>
        {rows}
    </div>
};

export interface AiSweeperPlayingFieldProps {
}

type AiSweeperPlayingFieldState = {
    subProps: MineSweeperPlayingFieldProps
};

function currentMineField(): MineField {
    return MINE_FIELD.value;
}

export class AiSweeperPlayingField extends React.Component<AiSweeperPlayingFieldProps, AiSweeperPlayingFieldState> {
    private readonly mineFieldListener: FxPropListener<MineField> = (oldValue, newValue) => {
        console.log('New field');
        this.setState(state => ({
            ...state,
            subProps: {field: newValue}
        }));
    };

    constructor(props: AiSweeperPlayingFieldProps) {
        super(props);
        this.state = {
            subProps: {field: currentMineField()}
        };
    }

    componentDidMount() {
        MINE_FIELD.addListener(this.mineFieldListener);
    }

    componentWillUnmount() {
        MINE_FIELD.removeListener(this.mineFieldListener);
    }

    render() {
        return React.createElement(MineSweeperPlayingField, this.state.subProps);
    }
}
