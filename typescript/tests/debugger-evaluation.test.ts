import inspector from "node:inspector";
import { afterEach, describe, expect, it } from "vitest";
import { lineString, Plotter } from "../src/index";

const session = new inspector.Session();

function post<T>(method: string, params: Record<string, unknown> = {}) {
  return new Promise<T>((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result as T);
    });
  });
}

describe("debugger evaluation", () => {
  afterEach(() => {
    try {
      session.disconnect();
    } catch {
      // The session might already be disconnected after a failed setup.
    }
  });

  it("evaluates Plotter visualization data from the current breakpoint frame", async () => {
    session.connect();
    await post("Debugger.enable");

    const paused = new Promise<Record<string, unknown>>((resolve, reject) => {
      session.once("Debugger.paused", (message) => {
        const callFrameId = message.params.callFrames[0]?.callFrameId;
        if (!callFrameId) {
          reject(new Error("Debugger paused without a call frame."));
          return;
        }

        post<{
          result: {
            value: Record<string, unknown>;
          };
        }>("Debugger.evaluateOnCallFrame", {
          callFrameId,
          expression: "view.getVisualizationData()",
          returnByValue: true
        })
          .then((response) => resolve(response.result.value))
          .catch(reject);
      });
    });

    function stopAtBreakpoint() {
      const view = new Plotter([
        lineString(
          [
            [0, 0, 0],
            [2, 0, 1]
          ],
          "debug-line"
        )
      ]);

      debugger;
    }

    stopAtBreakpoint();
    const visualization = await paused;

    expect(visualization).toMatchObject({
      kind: { plotly: true },
      data: [
        {
          type: "scatter3d",
          mode: "lines+markers",
          name: "debug-line",
          x: [0, 2, null],
          y: [0, 0, null],
          z: [0, 1, null]
        }
      ],
      layout: {
        scene: {
          aspectmode: "data",
          camera: { projection: { type: "orthographic" } }
        }
      }
    });
  });
});
