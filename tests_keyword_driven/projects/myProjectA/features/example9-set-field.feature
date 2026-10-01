# location: tests_keyword_driven/projects/myProjectA/features/example9-set-field.feature
#
# "When I set field <text> to <value>" with no explicit prefix (no "css:"/
# "role:"/etc) goes through resolveFieldLocator() in locator.ts, not the
# generic resolveLocator() cascade used by "I click"/asserts - it guesses
# which field to fill by id, name, label, placeholder, then data-test-id, in
# that order, every type tried as an EXACT (case-sensitive) match first, and
# only once every exact candidate has failed does it fall back to a
# case-insensitive PARTIAL (substring) match. Exact always wins, regardless
# of what else is on the page. Runs entirely against a local static HTML
# fixture, see generic/fixtures/set-field-page.html - no app/database/
# network required.

@featureName.example9-set-field @featureArea.keywordTest @exampleTests
Feature: Example — set-field priority cascade

  @scenarioName.example.setField.exactWins
  Scenario: Exact id always wins, even when a longer id contains it
    Given I am on "+var(setFieldPage)"
    When I set field "user" to "exact match"
    Then I should see field "css:#user" is "exact match"
    And I should see field "css:#users" is ""

  @scenarioName.example.setField.priority
  Scenario: id beats name when both exist as different elements
    Given I am on "+var(setFieldPage)"
    When I set field "priority-field" to "went to id"
    Then I should see field "css:#priority-field" is "went to id"
    And I should see field "css:[name='priority-field']" is ""

  @scenarioName.example.setField.id
  Scenario: id - exact then partial+case-insensitive
    Given I am on "+var(setFieldPage)"
    When I set field "unique-id-target" to "exact id"
    Then I should see field "css:#unique-id-target" is "exact id"
    When I set field "UNIQUE-ID" to "partial case-insensitive id"
    Then I should see field "css:#unique-id-target" is "partial case-insensitive id"

  @scenarioName.example.setField.name
  Scenario: name - exact then partial+case-insensitive
    Given I am on "+var(setFieldPage)"
    When I set field "unique-name-target" to "exact name"
    Then I should see field "css:[name='unique-name-target']" is "exact name"
    When I set field "UNIQUE-NAME" to "partial case-insensitive name"
    Then I should see field "css:[name='unique-name-target']" is "partial case-insensitive name"

  @scenarioName.example.setField.label
  Scenario: label - exact then partial+case-insensitive
    Given I am on "+var(setFieldPage)"
    When I set field "Email Address" to "exact label"
    Then I should see field "css:#label-target" is "exact label"
    When I set field "email" to "partial case-insensitive label"
    Then I should see field "css:#label-target" is "partial case-insensitive label"

  @scenarioName.example.setField.placeholder
  Scenario: placeholder - exact then partial+case-insensitive
    Given I am on "+var(setFieldPage)"
    When I set field "Search records here" to "exact placeholder"
    Then I should see field "placeholder:Search records here" is "exact placeholder"
    When I set field "RECORDS" to "partial case-insensitive placeholder"
    Then I should see field "placeholder:Search records here" is "partial case-insensitive placeholder"

  @scenarioName.example.setField.dataTestId
  Scenario: data-test-id - exact then partial+case-insensitive
    Given I am on "+var(setFieldPage)"
    When I set field "dti-target" to "exact data-test-id"
    Then I should see field "css:[data-test-id='dti-target']" is "exact data-test-id"
    When I set field "DTI" to "partial case-insensitive data-test-id"
    Then I should see field "css:[data-test-id='dti-target']" is "partial case-insensitive data-test-id"

  # the <input> itself carries no matching text at all (no id/name/
  # placeholder/data-test-id resembling "Team Name:") - only the <label
  # for="team_name"> does. getByLabel() resolves that for/id association on
  # its own (native HTML forms semantics), so this works with no extra code.
  @scenarioName.example.setField.labelForId
  Scenario: label resolves via for/id association, not sibling text on the input
    Given I am on "+var(setFieldPage)"
    When I set field "Team Name:" to "test"
    Then I should see field "css:#team_name" is "test"

  @scenarioName.example.setField.getValueIntoVariable
  Scenario: Read a field's value into a variable, then reuse it
    Given I am on "+var(setFieldPage)"
    When I set field "unique-id-target" to "round trip value"
    And I get field "css:#unique-id-target" value into variable "capturedValue"
    Then I should see variable "capturedValue" is "round trip value"
    When I set field "unique-name-target" to "+var(capturedValue)"
    Then I should see field "css:[name='unique-name-target']" is "round trip value"
