import { Dialog } from "../../ui/kit/Dialog";
import { WindowLayer } from "../../ui/kit/Window";
import { PersonaPortrait } from "../camp/art/PersonaArt";
import { TIP_LINES, type TipId } from "./tips";

/** Old Nan's First Steps line in the Hades dialogue box, like her window by the fire. */
export function TipDialog(props: { tip: TipId; onDone: () => void; onNoMore: () => void }) {
  return (
    <WindowLayer>
      <div className="nan-stage tip-stage" key={props.tip}>
        <Dialog
          name="Old Nan"
          role="First Steps"
          label="Old Nan, First Steps"
          portrait={<PersonaPortrait id="nan" />}
          answers={[
            { label: "Got it.", onPick: props.onDone },
            { label: "No more tips.", onPick: props.onNoMore },
          ]}
        >
          “{TIP_LINES[props.tip]}”
        </Dialog>
      </div>
    </WindowLayer>
  );
}
