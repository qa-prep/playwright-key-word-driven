# location: tests_keyword_driven/projects/myProjectA/features/example3-locators.feature
# ./run-tests.sh project=myProjectA tags=@example3 debug-mode=all headed=true speed=slow
# ./run-tests.sh project=myProjectA tags=@example3 
# ./run-tests.sh project=myProjectA tags=@exampleTests

#
# Walks through every explicit selector-prefix strategy in
# tests_keyword_driven/generic/support/locator.ts's buildPrefixedLocator()
# (text:, css:, cssSelector:, xpath:, id:, name:, class:, className:,
# placeholder:, ariaLabel:/aria-label:, linkText:, partialLinkText:,
# tagName:, data-test-id:, role:), plus role:'s extra-options syntax -
# role:<roleType>:<name>,<option>:<value>,... (see parseRoleValue() in the
# same file). Runs entirely against a local static HTML fixture, see
# generic/fixtures/locators-page.html - no app/database/network required.

@featureName.example3-locators @featureArea.keywordTest @exampleTests @example3 
Feature: Example — every explicit locator prefix

  @scenarioName.example.locators.cssBased
  Scenario: id / css / cssSelector / class / className all resolve the same node
    Given I am on "+var(locatorsPage)"
    Then I should see element "id:shared-target"
    And I should see element "css:#shared-target"
    And I should see element "cssSelector:div.shared-target-class"
    And I should see element "class:shared-target-class"
    And I should see element "className:shared-target-class"
    And I should see element "css:#shared-target" contains text "Shared target content"

  @scenarioName.example.locators.textAndXpath
  Scenario: text and xpath
    Given I am on "+var(locatorsPage)"
    Then I should see element "text:Unique fixture sentence for text locator"
    And I should see element "xpath://h3[@id='xpath-target']"
    And I should see element "xpath://h3[@id='xpath-target']" contains text "XPath heading target"
    # a bare "//..." is auto-detected as xpath, no prefix needed - same target as above
    And I should see element "//h3[@id='xpath-target']" contains text "XPath heading target"

  @scenarioName.example.locators.formFields
  Scenario: name / placeholder / ariaLabel / aria-label
    Given I am on "+var(locatorsPage)"
    Then I should see element "name:name-target"
    And I should see field "name:name-target" contains "name value"
    And I should see element "placeholder:Placeholder target text"
    And I should see element "ariaLabel:Aria label target"
    And I should see element "aria-label:Aria label target"

  @scenarioName.example.locators.tagAndDataTestId
  Scenario: tagName and data-test-id
    Given I am on "+var(locatorsPage)"
    Then I should see element "tagName:footer"
    And I should see element "tagName:footer" contains text "Footer tag target"
    And I should see element "data-test-id:data-test-id-target"
    And I should see element "data-test-id:data-test-id-target" contains text "Data test id target content"

  @scenarioName.example.locators.linkSynonyms
  Scenario: linkText / partialLinkText are just shorthand for role:link
    Given I am on "+var(locatorsPage)"

    # linkText: is exact-match by definition - the same as role:link with exact:true
    When I click any "linkText:Teams Dashboard"
    When I click any "role:link:Teams Dashboard,exact:true"

    # partialLinkText: is substring-match - the same as role:link with
    # exact:false, and the same as plain role:link with no exact option at
    # all (false is Playwright's own default when exact is omitted)
    When I click any "partialLinkText:Teams"
    When I click any "role:link:Teams,exact:false"
    When I click any "role:link:Teams"

    # the link's own text never changes between clicks (that's what keeps
    # every synonym above matching it on every attempt) - a separate counter
    # proves all 5 really did find and click the one real link, not 0
    Then I should see element "css:#teams-link-count" contains text "clicks: 5"

  @scenarioName.example.locators.ariaRoleOptions
  Scenario: role: with extra options - exact / level / checked
    Given I am on "+var(locatorsPage)"
    Then I should see element "role:button:Role Button Target"
    And I should see element "role:heading:Role Heading Target,level:2"
    And I should see element "role:checkbox:Role Checkbox Target,checked:false"
