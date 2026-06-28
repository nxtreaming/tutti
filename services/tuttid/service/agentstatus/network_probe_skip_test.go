package agentstatus

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"testing"
)

// While a provider is installing, List must skip the network connectivity probe
// (the network doesn't change during an install, and re-probing a flaky proxy on
// every progress poll makes the network step flicker). Such a provider reports
// no Network; the active-action is still surfaced.
func TestListSkipsNetworkProbeWhileInstalling(t *testing.T) {
	const provider = "codex"

	// Force a clean active-action baseline for this provider.
	resetCtx := withActiveActionToken(context.Background(), nextActiveActionToken())
	claimActiveAction(resetCtx, provider, ActiveAction{})
	clearActiveAction(resetCtx, provider)

	var networkCalls int
	newService := func() Service {
		s := testService(func(_ string) (string, error) {
			return "", errors.New("not found")
		}, map[string]bool{})
		s.HTTPClient = &http.Client{Transport: networkRoundTripFunc(func(*http.Request) (*http.Response, error) {
			networkCalls++
			return &http.Response{StatusCode: http.StatusNoContent, Body: http.NoBody}, nil
		})}
		s.ResolveProxy = func(*http.Request) (*url.URL, error) { return nil, nil }
		return s
	}

	// Baseline: no install in flight → List probes the network.
	networkCalls = 0
	snap, err := newService().List(context.Background(), ListInput{Providers: []string{provider}})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(snap.Providers) != 1 || snap.Providers[0].Network == nil {
		t.Fatalf("baseline: Network = %#v, want probed", snap.Providers)
	}
	if networkCalls == 0 {
		t.Fatal("baseline: expected the network to be probed")
	}

	// With a running install action, List skips the probe entirely.
	installCtx := withActiveActionToken(context.Background(), nextActiveActionToken())
	claimActiveAction(installCtx, provider, ActiveAction{
		ID:     ActionInstall,
		Status: "running",
		Step:   "adapter",
	})
	t.Cleanup(func() { clearActiveAction(installCtx, provider) })

	networkCalls = 0
	snap2, err := newService().List(context.Background(), ListInput{Providers: []string{provider}})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if snap2.Providers[0].Network != nil {
		t.Fatalf("installing: Network = %#v, want nil (probe skipped)", snap2.Providers[0].Network)
	}
	if networkCalls != 0 {
		t.Fatalf("installing: network probed %d times, want 0", networkCalls)
	}
	if snap2.Providers[0].ActiveAction == nil {
		t.Fatal("installing: ActiveAction = nil, want the running install action surfaced")
	}
}
