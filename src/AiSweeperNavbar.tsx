import React from "react";
import {Navbar, NavbarBrand} from "reactstrap";

export interface AiSweeperNavbarProps {
}

type AiSweeperNavbarState = {
    open: boolean
};

export class AiSweeperNavbar extends React.Component<AiSweeperNavbarProps, AiSweeperNavbarState> {
    constructor(props: AiSweeperNavbarProps) {
        super(props);

        this.state = {
            open: false
        }
    }

    private toggle() {
        this.setState(state => ({...state, open: !state.open}));
    }

    render() {
        return <Navbar light color="light" expand="md">
            <NavbarBrand href="/">
                aisweeper
            </NavbarBrand>
            {/* unused, no navbar entries yet!
            <NavbarToggler onClick={() => this.toggle()}/>

            <Collapse isOpen={this.state.open} navbar>
                <Nav className="ml-auto" navbar>

                </Nav>
            </Collapse>
            */}
        </Navbar>;
    }
}