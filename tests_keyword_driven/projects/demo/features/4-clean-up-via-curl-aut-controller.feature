# location: tests_keyword_driven/projects/demo/features/clean-up-via-curl-aut-controller.feature
# location: tests_keyword_driven/projects/demo/features/registration.feature
# ./run-tests.sh env=demo tags=@demoCleanUpCurl debug-mode=all
# ./run-tests.sh env=demo tags=@demoCleanUpCurl 



@demoCleanUpCurl
Feature: Cean up user via curl 

  @demoCleanUpCurlAutController
  Scenario: clean up user via automation controller end point 

    # For automation, if we re-run this test, we will hit dulicate emails
    # we could solve this by adding a random id (but we still get a build up and the test is then non-deterministic)
    # What I suggest is a clean up before the test runs...
    # We can do this in many different ways, we can either use a general end point on the controller of the appliction (requires dev adding an Automation end point just for testing)
    # Or if real api endpoint exit in your appication, you can use those 

    # 1) Using a website automation controller endpoint
    # This requires an automation endpoint added to the application (useful if you have many users do delete)
    # Given I clean up user data for email "bobsemail@example.com"

    # 2) Using real curls, if they exist, to delete the users
    # This uses real delete user api endpoints (you will need to add the curls for these if your appliction can delete users)
    # This one is a bit more tricky to do in this demo (I can do it for my site, but it's not a general solution for everyone)
    # My site for example requires a double auth to use the ACP to search for a user id, so that we can then delete a user 
    # (and this will be confusing to teach and not adaptable to your project)

    # 1) the test-automation endpoint takes a single JSON body - this is the
    # we could also do this with an single step: "I clean up user data for email ..."
    # which is the same as runing the curl steps below.

    # RUNNING THIS REQUIRES THE TEST AUTOMATION ENDPOINT ADDED BY DEVS (please make sure this endpoint is NEVER added to LIVE, it is a testing endpoing only)

    Given I set variable "body" to "{\"email\":\"bobsemail@example.com\"}"
    When I curl template "test-automation/delete-user-by-email" into variable "deleteResponse"
    Then I should see variable "deleteResponse" contains "success"

    # once you can do something like the above, you can turn this into a single step so your tests are a bit more readable
    # and add a step to the start (keep in mind this step should also pass if there is no user data)

    #  I clean up user data for email contains "bobsemail@example.com"
  

  @demoCleanUpCurlExistingEndPoint
  Scenario: clean up user via curl of exiting end delete endpoint 


    # 2) using and existing delete end point that the site already has, the issue with this is
    # it is very likely on your site, there is an endpoint that already exist for "delete user",
    # but it's also very likely you will need to the id of the user in order to delete them.
    # It also verly likely you will need to do the delete with a admin session
    # It's unlikey you can do id lookups for a given email (I can with my site using a 2 auth admin session, it is unlikey to be the same for you)

    # So to make this general, I am going to connect to the database and look this user up, then use the id to do the delete
    # (I recommend the 1st workflow above, ask devs to add an end point for automation so we easily query the database just in ci and test environments (avoid adding to live!))
    # For this example though, we will query via the database, get the id, 
    # Then if a delete api endpoint exists, delete the user using a  delete curl (you will need to add your own delete curl if a delete endpoint exists)

    # I DO NOT recomend deleting users directly from the database, this will likely cause corrupt data (you dont know what other tables need to be cleaned up)
    # Instead use real API endpoint that exist on your site

    # before you can run this part, you will need to add to # config/demo.env
    #_DB_HOST=localhost
    #_DB_PORT=thePort
    #_DB_NAME=theDbName
    #_DB_USER=theDbUser
    #_DB_PASSWORD=theDbPass


    When I db count "ds_core_users" rows where column "email" like "bobsemail@example.com" into variable "likeCount"
    And I spit "+var(likeCount)"

    When I db count "ds_core_users" rows where column "email" like "bobsemail" into variable "likeCount"
    And I spit "+var(likeCount)"

    When I db get newest "ds_core_users" column "user_id" where column "email" like "bobsemail" into variable "userId"
    When I db get newest "ds_core_users" column "username" where column "user_id" is "+var(userId)" into variable "username"
    When I spit "+var(userId)"
    When I spit "+var(username)"

    # now that we have the id, delete the user for real via whatever delete endpoint your site already has
    # You will need to change this, I have only added this as an example:  - demp/curl-templates/member/delete.curl is

    When I curl template "member/delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
    Then I should see variable "deleteResponse" contains "flagged for deletion"

    # I also needed a hard delete:
    # When I curl template "member/hard-delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
    # Then I should see variable "deleteResponse" contains "deleted"