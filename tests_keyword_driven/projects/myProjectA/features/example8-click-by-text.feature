# location: tests_keyword_driven/projects/myProjectA/features/example8-click-by-text.feature
#
# "When I click <text>" with no explicit prefix (no "css:"/"role:"/etc) goes
# through resolveClickTarget() in locator.ts, not the generic resolveLocator()
# cascade used by asserts/fills - it guesses what's clickable by visible
# text: link, then button, then dropdown (native <select>, or a styled
# [role=combobox]/[aria-haspopup] trigger), then radio, then checkbox - every
# type tried as an EXACT match first, then every type again as a PARTIAL
# (substring) match. Runs entirely against a local static HTML fixture, see
# generic/fixtures/click-by-text-page.html - no app/database/network required.

@featureName.example8-click-by-text @featureArea.keywordTest @exampleTests
Feature: Example — click-by-text priority cascade

  @scenarioName.example.clickByText.priority
  Scenario: A link beats a button when both have the exact same text
    Given I am on "+var(clickByTextPage)"
    When I click "Submit"
    Then I should see element "css:#submit-link-count" contains text "clicks: 1"
    And I should see element "css:#submit-button-count" contains text "clicks: 0"

  @scenarioName.example.clickByText.link
  Scenario: Link - exact then partial text match
    Given I am on "+var(clickByTextPage)"
    When I click "Go Home"
    Then I should see element "css:#home-link-count" contains text "clicks: 1"
    When I click "Home"
    Then I should see element "css:#home-link-count" contains text "clicks: 2"

  @scenarioName.example.clickByText.button
  Scenario: Button - exact then partial text match
    Given I am on "+var(clickByTextPage)"
    When I click "Add New Team"
    Then I should see element "css:#add-team-button-count" contains text "clicks: 1"
    When I click "Team"
    Then I should see element "css:#add-team-button-count" contains text "clicks: 2"

  # real Vue ds-form-row markup - proves "When I click <option text>" works
  # for a native <select> with no changes, same as the "Team Name:" label
  # case in example9-set-field.feature
  @scenarioName.example.clickByText.realNativeSelect
  Scenario: Native select - real ds-form-row markup (dropdown from a label-wrapped select)
    Given I am on "+var(clickByTextPage)"
    When I click "Invite Only"
    Then I should see field "css:#team_type" is "invite_only"

  @scenarioName.example.clickByText.nativeDropdown
  Scenario: Dropdown (a) - native select, exact and partial option text both selectOption()
    Given I am on "+var(clickByTextPage)"
    When I click "Gold Plan"
    Then I should see field "css:#plan-select" contains "gold"
    When I click "Silver"
    Then I should see field "css:#plan-select" contains "silver"

  @scenarioName.example.clickByText.dropdownLookalike
  Scenario: Dropdown (b) - styled trigger, exact then partial text match
    Given I am on "+var(clickByTextPage)"
    When I click "Open Status Menu"
    Then I should see element "css:#status-dropdown-count" contains text "clicks: 1"
    When I click "Status"
    Then I should see element "css:#status-dropdown-count" contains text "clicks: 2"

  @scenarioName.example.clickByText.radio
  Scenario: Radio button - matched by its label text
    Given I am on "+var(clickByTextPage)"
    Then I should see element "css:#radio-enterprise" is "unchecked"
    When I click "Enterprise Plan"
    Then I should see element "css:#radio-enterprise" is "checked"

  @scenarioName.example.clickByText.checkbox
  Scenario: Checkbox - matched by its label text
    Given I am on "+var(clickByTextPage)"
    Then I should see element "css:#terms-checkbox" is "unchecked"
    When I click "Accept Terms"
    Then I should see element "css:#terms-checkbox" is "checked"

  # "I get clipboard into variable" reads the REAL OS/browser clipboard, not
  # just the source field's value - proves the actual Copy button writes to
  # it, which a plain "I get field value" step can't test at all.
  @scenarioName.example.clickByText.clipboard
  Scenario: Reading the real clipboard after a Copy button click
    Given I am on "+var(clickByTextPage)"
    When I click "Copy"
    And I get clipboard into variable "copiedValue"
    Then I should see variable "copiedValue" is "https://example.com/invite/abc123"

  # resolveLocator() (used by "I should see element" and most other asserts/
  # fills - everything except "I click" and "I set field", which have their
  # own dedicated cascades) gets the same role-based fallback too: link,
  # button, dropdown, radio, checkbox, each exact then partial - so you can
  # describe an element by what it looks like on the page, the same way you
  # already can for "I click", without knowing it's a <button> vs an <a>.
  @scenarioName.example.clickByText.assertWithoutPrefix
  Scenario: I should see element also resolves by visible text, no prefix needed
    Given I am on "+var(clickByTextPage)"
    # link wins over button on the same exact text, same priority as I click -
    # only the <a> has an href, so this proves WHICH element matched, not
    # just that something matching "Submit" exists
    Then I should see element "Submit" has attribute "href"

    And I should see element "Add New Team" is "enabled"
    And I should see element "Enterprise Plan" is "unchecked"
    And I should see element "Accept Terms" is "unchecked"
