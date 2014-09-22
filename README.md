# TODO

* Random previous entry
* Get scheduler figured out properly
* Finish up settings page

# WhoaLife

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

Create an app on Heroku

    heroku create
    
Optionally rename the app to something you like

    heroku apps:rename your_app_name
    
Make note of your app's web URL

    heroku apps:info | grep 'Web URL'
    
Add the required plugins

    heroku addons:add mongohq
    heroku addons:add sendgrid
    heroku addons:add cloudmailin --target http://your_app_name.herokuapp.com/emails
    heroku addons:add scheduler
    
Deploy the app

    git push heroku master
    
Perform initial app setup

    heroku apps:open
    
Add a scheduled task to send your daily email

    heroku addons:open scheduler
    
In the resulting dashboard, add a once daily task with the following command.

    curl -XPOST http://your_app_name.herokuapp.com/jobs/send
    
You should set the time of the task to run when you'd like to receive your
email.