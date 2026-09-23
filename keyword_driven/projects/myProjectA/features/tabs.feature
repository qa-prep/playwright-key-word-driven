# location: keyword_driven/projects/default/features/tabs.feature

@tabsTest
Feature: Tab handling
  Covers opening, switching between, and closing browser tabs, plus the
  "no newtab" trick for forcing a target="_blank" link to stay in the same tab.
  Runs entirely against local static HTML fixtures.

  Scenario: Opening a link in a new tab and switching to it
    Given I am on "+var(tabsPage)"
    When I click "css:#open-tab-2" and switch to the new tab
    Then I should see url ends with "tabs-page-2.html"
    And I should see viewport text "Tab Two"
    And I should see tab count is "2"

  Scenario: Switching back to the original tab
    Given I am on "+var(tabsPage)"
    When I click "css:#open-tab-2" and switch to the new tab
    Then I should see url ends with "tabs-page-2.html"
    When I switch to the original tab
    Then I should see url ends with "tabs-page.html"
    And I should see viewport text "Tabs Test Page"

  Scenario: Opening multiple tabs and switching between them by index
    Given I am on "+var(tabsPage)"
    When I click "css:#open-tab-2" and switch to the new tab
    Then I should see tab count is "2"

    When I switch to the original tab
    When I click "css:#open-tab-3" and switch to the new tab
    Then I should see tab count is "3"
    And I should see viewport text "Tab Three"

    When I switch to tab "2"
    Then I should see viewport text "Tab Two"

    When I switch to tab "3"
    Then I should see viewport text "Tab Three"
    Then I should see viewport text "I will purposely fail to demo failures"

  Scenario: Closing the current tab returns to the original
    Given I am on "+var(tabsPage)"
    When I click "css:#open-tab-2" and switch to the new tab
    Then I should see tab count is "2"

    When I close the current tab
    Then I should see tab count is "1"
    And I should see url ends with "tabs-page.html"

  Scenario: Forcing a target="_blank" link to open in the same tab
    Given I am on "+var(tabsPage)"
    When I click "css:#open-tab-2" no newtab
    Then I should see url ends with "tabs-page-2.html"
    And I should see tab count is "1"