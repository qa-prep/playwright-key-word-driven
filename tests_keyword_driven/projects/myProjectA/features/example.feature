# location: tests_keyword_driven/projects/default/features/example.feature

@featureName.example @featureArea.keywordTest @exampleTests 
Feature: Example — generic step library walkthrough
  This runs entirely against a local static HTML fixture.
  No database, no app under test, and no network access required.


  @scenarionName.example.interacting
  Scenario: Interacting with and asserting against page elements
    Given I am on "+var(fixturePage)"
    Then I should see element "css:#heading"
    And I should see viewport text "Test Fixture Page"

    When I set field "css:#text-field" to "hello world"
    Then I should see field "css:#text-field" is "hello world"

    When I click "css:#checkbox-field"
    Then I should see element "css:#checkbox-field" is "checked"

    Then I should see element "css:#enabled-btn" is "enabled"
    And I should see element "css:#disabled-btn" is "disabled"

    When I click "css:#click-counter-btn"
    When I click "css:#click-counter-btn"
    Then I should see element "css:#click-counter-btn" contains text "Click me (2)"

    When I click the "2" "css:.list-item"
    Then I should see the "2" element "css:.list-item" contains text "Item 2"

    When I double click "css:#dblclick-btn"
    Then I should see element "css:#dblclick-btn" contains text "Double clicked!"

    Then I should not see visible element "css:#toggle-visibility"
    When I click "css:#toggle-visibility-btn"
    Then I should see visible element "css:#toggle-visibility"

    Then I should see element "css:#content-text" contains text "sample text"
    And I should see element "css:#styled-text" computed style "color" is "rgb(36, 196, 122)"

    When I wait for element "css:#delayed-element" to be visible
    Then I should see visible element "css:#delayed-element"

    When I set browser width "800" height "400"
    When I scroll to "css:#scroll-target"
    Then I should see visible element "css:#scroll-target"
    And I should see page has scrollbar

    Then I should see url ends with "test-page.html"
    And I should see url contains "test-page"


  @scenarionName.example.navpages
  Scenario: Navigating between pages
    Given I am on "+var(fixturePage)"
    When I click "css:#go-to-page-2"
    Then I should see url ends with "test-page-2.html"
    And I should see viewport text "Page Two"

    When I click the browser back button
    Then I should see url ends with "test-page.html"