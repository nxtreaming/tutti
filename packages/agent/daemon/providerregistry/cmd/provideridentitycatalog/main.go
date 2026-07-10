// Command provideridentitycatalog emits the GUI-facing identity and target
// catalog for providers that have completed the provider-registry migration.
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/tutti-os/tutti/packages/agent/daemon/providerregistry"
)

type catalogEntry struct {
	ProviderID  string   `json:"providerId"`
	DisplayName string   `json:"displayName"`
	IconKey     string   `json:"iconKey"`
	LocaleKey   string   `json:"localeKey"`
	Aliases     []string `json:"aliases"`
	Target      target   `json:"target"`
}

type target struct {
	ID            string `json:"id"`
	LaunchRefType string `json:"launchRefType"`
	Enabled       bool   `json:"enabled"`
	SortOrder     int    `json:"sortOrder"`
}

func main() {
	if err := providerregistry.ValidateMigrated(); err != nil {
		fatal(err)
	}

	descriptors := providerregistry.Migrated()
	entries := make([]catalogEntry, 0, len(descriptors))
	for _, descriptor := range descriptors {
		entries = append(entries, catalogEntry{
			ProviderID:  descriptor.Identity.ID,
			DisplayName: descriptor.Identity.DisplayName,
			IconKey:     descriptor.Identity.IconKey,
			LocaleKey:   descriptor.Identity.LocaleKey,
			Aliases:     append([]string{}, descriptor.Identity.Aliases...),
			Target: target{
				ID:            descriptor.Target.ID,
				LaunchRefType: descriptor.Target.LaunchRefType,
				Enabled:       descriptor.Target.Enabled,
				SortOrder:     descriptor.Target.SortOrder,
			},
		})
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(entries); err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
