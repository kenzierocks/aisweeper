import $ from "jquery";
import {React, ReactDOM} from "./reactutil";
import {AiSweeperNavbar} from "./AiSweeperNavbar";
import {AiSweeperPlayingField} from "./AiSweeperPlayingField";
import {GLOBAL_AI, MINE_FIELD, newGame} from "./Ai";
import "nodent-runtime";

function startRenderLoop() {
    function renderLoop() {
        let cont: boolean = true;
        try {
            const ai = GLOBAL_AI.value;
            cont = ai.process();
        } finally {
            if (cont) {
                setTimeout(() => window.requestAnimationFrame(renderLoop), 1);
            } else {
                if (MINE_FIELD.value.isWinningField()) {
                    console.log("That's a winner!");
                    startRenderLoop();
                    return;
                }

                // some guess situations we can just kill
                if (MINE_FIELD.value.remaining == 4) {
                    // this is probably just an unguessable board
                    console.log("Unguessable?\n" + MINE_FIELD.value.toString());
                    startRenderLoop();
                }
            }
        }
    }

    newGame({
        width: 10,
        height: 10,
        mines: 4
    });
    window.requestAnimationFrame(renderLoop);
}

$(() => {
    ReactDOM.render(
        <div>
            <AiSweeperNavbar/>
            <div className="d-flex justify-content-center mx-auto text-center">
                <div className="aisweeper-field-container">
                    <div className="aisweeper-field">
                        <AiSweeperPlayingField/>
                    </div>
                </div>
            </div>
        </div>,
        document.getElementById('container')
    );

    startRenderLoop();
});
