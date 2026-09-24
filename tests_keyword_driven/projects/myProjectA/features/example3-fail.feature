# location: tests_keyword_driven/projects/myProjectA/features/examplfail.feature

@featureName.example3-fail @featureArea.fail @exampleFailTests 
Feature: error handling
  Covers asserting and failing steps

  @scenarionName.examplfail.beforeEnd
  Scenario: A scenario that fails before the end
    Given I am on "+var(fixturePage)"
    Then I should see element "css:#heading"
    And I should see viewport text "I am a failing step"
    When I set field "css:#text-field" to "hello world"
    Then I should see field "css:#text-field" is "hello world"


  @scenarionName.examplfail.atEnd
  Scenario: A scenario that fails at the end
    Given I am on "+var(fixturePage)"
    Then I should see element "css:#heading"
    And I should see viewport text "I am also a failing step"
