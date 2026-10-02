# location: tests_keyword_driven/projects/myProjectA/features/example10-collapse-expand.feature
#
# "I expand"/"I collapse" are idempotent - they only click a toggle if it
# ISN'T already in the wanted state (aria-expanded="true"/"false" on the
# clicked element itself), so you never have to know/assert what state a
# collapsible was left in by an earlier step. No-nth form acts on every
# matching element; "the nth" form targets just one. Runs entirely against a
# local static HTML fixture, see generic/fixtures/collapse-page.html.

@featureName.example10-collapse-expand @featureArea.keywordTest @exampleTests
Feature: Example — idempotent expand/collapse

  @scenarioName.example.collapseExpand.idempotentExpand
  Scenario: Expanding only clicks toggles that are actually collapsed
    Given I am on "+var(collapsePage)"
    # Group 1 and 3 start collapsed, Group 2 starts already expanded
    Then I should see element "css:#toggle-1" attribute "aria-expanded" is "false"
    And I should see element "css:#toggle-2" attribute "aria-expanded" is "true"
    And I should see element "css:#toggle-3" attribute "aria-expanded" is "false"

    When I expand "class:toggle-group"

    Then I should see element "css:#toggle-1" attribute "aria-expanded" is "true"
    And I should see element "css:#toggle-2" attribute "aria-expanded" is "true"
    And I should see element "css:#toggle-3" attribute "aria-expanded" is "true"
    And I should see visible element "css:#panel-1"
    And I should see visible element "css:#panel-2"
    And I should see visible element "css:#panel-3"

    # the real proof of idempotency: group 2 was already expanded, so it
    # should never have been clicked at all - only 1 and 3 needed a click
    Then I should see element "css:#toggle-1-count" contains text "clicks: 1"
    And I should see element "css:#toggle-2-count" contains text "clicks: 0"
    And I should see element "css:#toggle-3-count" contains text "clicks: 1"

  @scenarioName.example.collapseExpand.idempotentCollapse
  Scenario: Collapsing only clicks toggles that are actually expanded
    Given I am on "+var(collapsePage)"
    When I collapse "class:toggle-group"

    Then I should see element "css:#toggle-1" attribute "aria-expanded" is "false"
    And I should see element "css:#toggle-2" attribute "aria-expanded" is "false"
    And I should see element "css:#toggle-3" attribute "aria-expanded" is "false"

    # group 1 and 3 were already collapsed - only group 2 needed a click
    Then I should see element "css:#toggle-1-count" contains text "clicks: 0"
    And I should see element "css:#toggle-2-count" contains text "clicks: 1"
    And I should see element "css:#toggle-3-count" contains text "clicks: 0"

    # calling it again changes nothing further - still idempotent
    When I collapse "class:toggle-group"
    Then I should see element "css:#toggle-2-count" contains text "clicks: 1"

  @scenarioName.example.collapseExpand.nth
  Scenario: Expanding/collapsing the Nth toggle targets just that one
    Given I am on "+var(collapsePage)"
    When I expand the "1st" "class:toggle-group"
    Then I should see element "css:#toggle-1" attribute "aria-expanded" is "true"
    And I should see element "css:#toggle-3" attribute "aria-expanded" is "false"

    When I collapse the "2nd" "class:toggle-group"
    Then I should see element "css:#toggle-2" attribute "aria-expanded" is "false"
    And I should see element "css:#toggle-1" attribute "aria-expanded" is "true"
