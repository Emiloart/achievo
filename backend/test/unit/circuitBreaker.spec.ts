import { CircuitBreaker } from "../../src/chain/reliability/circuit.breaker";
import { RpcUnavailableError } from "../../src/chain/reliability/rpc.errors";

describe("CircuitBreaker", () => {
  it("opens after consecutive failures and recovers after cooldown", () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(0);

    breaker.assertReady();
    breaker.recordFailure();
    breaker.assertReady();
    breaker.recordFailure();

    expect(() => breaker.assertReady()).toThrow(RpcUnavailableError);

    nowSpy.mockReturnValue(2000);
    breaker.assertReady();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe("CLOSED");

    nowSpy.mockRestore();
  });
});
