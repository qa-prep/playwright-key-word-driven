# location: tests_keyword_driven/projects/myProjectA/features/example5-fail.feature
# ./run-tests.sh project=myProjectA tags=@example5 debug-mode=all headed=true speed=slow
# ./run-tests.sh project=myProjectA tags=@example5 
# ./run-tests.sh project=myProjectA tags=@exampleTests

@featureName.example5-fail @featureArea.fail @exampleFailTests @example5
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
