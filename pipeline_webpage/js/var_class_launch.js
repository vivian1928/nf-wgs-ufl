var run_id = '';
var sample_id = [];
var filtered_panels = [];

function distinct(value, index, self) {
    return self.indexOf(value) === index;
}

async function launch_reporting() {

    $("#report_selection").hide();
    $("#report_selection_back").hide();
    $("#email").hide();
    $('#launch_report_button').hide();


    var samples = document.getElementsByName('sample_id');
    for(var i = 0; i < samples.length; i++) {
        if(samples[i].checked==true){
            sample_id.push(samples[i].id);
        }
    }

    var email = document.getElementById('user_email').value;

    var url = {};

    var batch = new AWS.Batch({apiVersion: '2016-08-10'});
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
    var ses = new AWS.SES({apiVersion: '2010-12-01'});

    for(var i = 0; i < sample_id.length; i++){

        var panels = $("#"+sample_id[i]+"_select :selected").map((_, e) => e.value).get();

        if(panels[0] == "low_coverage") {
            var lc = "5x";
            panels.splice(0, 1);
        } else {
            var lc = "30x";
        }

        url[sample_id[i]] = {};

        var multiqc_url_params = { 
            Bucket: 'hakmonkey-genetics-lab',
            Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/MultiQC/'+sample_id[i]+'.html',
            Expires: 86400 // change to 86400 = 1 day
        };

        var multiqc_link = s3.getSignedUrl('getObject', multiqc_url_params);

        url[sample_id[i]]['MultiQC'] = ['<a href='+multiqc_link+'>MultiQC Report</a>']

        if(panels.length != 0){
            for(var j = 0; j < panels.length; j++){
                var job_params = {
                    jobDefinition: "var_class-ufl-germline:1", 
                    jobName: sample_id[i]+'_'+panels[j], 
                    jobQueue: "hakmonkey-var_class",
                    containerOverrides: {
                        'command': [
                            'bash',
                            '-c',
                            'aws s3 cp s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/variants/'+sample_id[i]+'_concat.vcf.gz /; aws s3 cp s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/variants/'+sample_id[i]+'_concat.vcf.gz.tbi /; aws s3 cp s3://hakmonkey-genetics-lab/Pipeline/Reference/panels/'+panels[j]+' /; /varClass.py -v '+sample_id[i]+'_concat.vcf.gz -t 8 -s '+sample_id[i]+' -p '+panels[j]+' -c '+lc+'; /json_to_csv.py -j '+sample_id[i]+'_'+panels[j]+'_report.json; /g_ranges.py -j '+sample_id[i]+'_'+panels[j]+'_report.json -s '+sample_id[i]+'; /CNV_json_plot.R '+sample_id[i]+'; aws s3 cp '+sample_id[i]+'_'+panels[j]+'_report.json s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/; aws s3 cp '+sample_id[i]+'_'+panels[j]+'_report.xlsx s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/; aws s3 cp '+sample_id[i]+'_cnv.pdf s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/'
                        ]
                    }
                };

                var json_url_params = { 
                    Bucket: 'hakmonkey-genetics-lab',
                    Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/'+sample_id[i]+'_'+panels[j]+'_report.json',
                    Expires: 86400 // change to 86400 = 1 day
                };
                var xlsx_url_params = { 
                    Bucket: 'hakmonkey-genetics-lab',
                    Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/'+sample_id[i]+'_'+panels[j]+'_report.xlsx',
                    Expires: 86400 // change to 86400 = 1 day
                };
                var cnv_url_params = { 
                    Bucket: 'hakmonkey-genetics-lab',
                    Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/'+panels[j]+'/'+sample_id[i]+'_cnv.pdf',
                    Expires: 86400 // change to 86400 = 1 day
                };
                var json_link = s3.getSignedUrl('getObject', json_url_params);
                var xlsx_link = s3.getSignedUrl('getObject', xlsx_url_params);
                var cnv_link = s3.getSignedUrl('getObject', cnv_url_params);
                
                url[sample_id[i]][panels[j]] = [
                    '<a href='+json_link+'>JSON Report</a>',
                    '<a href='+xlsx_link+'>XLSX Report</a>',
                    '<a href='+cnv_link+'>CNV Plot</a>'
                ];

                // batch.submitJob(job_params, function(err, data) {
                //     if(err) {
                //         console.log(err, err.stack);
                //     } else {
                //         $("#launch_img").show();
                //         console.log(data);
                //     }
                // });
            }
        } else {
            var job_params = {
                jobDefinition: "var_class-ufl-germline:1", 
                jobName: sample_id[i]+'_General_Report', 
                jobQueue: "hakmonkey-var_class",
                containerOverrides: {
                    'command': [
                        'bash',
                        '-c',
                        'aws s3 cp s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/variants/'+sample_id[i]+'_concat.vcf.gz /; aws s3 cp s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/variants/'+sample_id[i]+'_concat.vcf.gz.tbi /; /varClass.py -v '+sample_id[i]+'_concat.vcf.gz -t 8 -s '+sample_id[i]+' -c '+lc+'; /json_to_csv.py -j '+sample_id[i]+'_report.json; /g_ranges.py -j '+sample_id[i]+'_report.json -s '+sample_id[i]+'; /CNV_json_plot.R '+sample_id[i]+'; aws s3 cp '+sample_id[i]+'_report.json s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/; aws s3 cp '+sample_id[i]+'_report.xlsx s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/; aws s3 cp '+sample_id[i]+'_cnv.pdf s3://hakmonkey-genetics-lab/Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/'
                    ]
                }
            };
            
            var json_url_params = { 
                Bucket: 'hakmonkey-genetics-lab',
                Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/'+sample_id[i]+'_report.json',
                Expires: 86400 // change to 86400 = 1 day
            };
            var xlsx_url_params = { 
                Bucket: 'hakmonkey-genetics-lab',
                Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/'+sample_id[i]+'_report.xlsx',
                Expires: 86400 // change to 86400 = 1 day
            };
            var cnv_url_params = { 
                Bucket: 'hakmonkey-genetics-lab',
                Key: 'Pipeline_Output/'+run_id+'/'+sample_id[i]+'/General_Report/'+sample_id[i]+'_cnv.pdf',
                Expires: 86400 // change to 86400 = 1 day
            };
            var json_link = s3.getSignedUrl('getObject', json_url_params);
            var xlsx_link = s3.getSignedUrl('getObject', xlsx_url_params);
            var cnv_link = s3.getSignedUrl('getObject', cnv_url_params);

            url[sample_id[i]]['General_Report'] = [
                '<a href='+json_link+'>JSON Report</a>',
                '<a href='+xlsx_link+'>XLSX Report</a>',
                '<a href='+cnv_link+'>CNV Plot</a>'
            ];

            // batch.submitJob(job_params, function(err, data) {
            //     if(err) {
            //         console.log(err, err.stack);
            //     } else {
            //         $("#launch_img").show();
            //         console.log(data);
            //     }
            // });
        }
    }

    console.log(email)

    var url_list = JSON.stringify(url, null, 4);

    console.log(url_list);

    var email_params = {
        Destination: {
            ToAddresses: [ email ]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8", 
                    Data: "The following is/are the link(s) for the requested report(s). The links should be valid for one day.<br/><br/>Please wait roughly 10 min before checking for the reports.<br/><br/><pre>"+url_list+"</pre><br/><br/>Cheers,<br/>Johnny"
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Link(s) for requested research report(s)"
            }
        },
        Source: "jonathan.bravo@neurology.ufl.edu"
    };

    ses.sendEmail(email_params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });

    $("#loader").show();

    await new Promise(r => setTimeout(r, 2000));

    $("#loader").hide();

    $("#menu").show();
    location.reload();
}

function get_panels(div_id, in_id){

    var parent = document.getElementById(div_id);
    var sample_box = document.getElementById(in_id);

    if(sample_box.checked == true) {

        var select_div = document.createElement("div");
        select_div.setAttribute("class", "flex-child-child");
        select_div.setAttribute("id", in_id+"_select-div");
        var s = document.createElement("script");
        var panels_select = document.createElement("select");

        panels_select.setAttribute("multiple", "multiple");
        panels_select.setAttribute("id", in_id+"_select")
        s.setAttribute("type", "text/javascript");
        s.setAttribute("id", in_id+"_my-script");
        s.innerHTML = "$('#"+in_id+"_select').multiSelect();"

        var low_coverage = document.createElement("option");
        low_coverage.setAttribute("value", "low_coverage");
        low_coverage.setAttribute("id", "low_coverage");
        low_coverage.innerHTML = "LOW COVERAGE";
        panels_select.appendChild(low_coverage);

        for (const i in filtered_panels) {
            var choiceSelection = document.createElement("option");

            choiceSelection.setAttribute("value", filtered_panels[i]);
            choiceSelection.setAttribute("id", "panel_"+i);

            choiceSelection.innerHTML=filtered_panels[i];

            panels_select.appendChild(choiceSelection);
        }

        select_div.appendChild(panels_select);
        select_div.appendChild(s);

        parent.appendChild(select_div);
    } else {

        var select_div = document.getElementById(in_id+"_select-div");

        parent.removeChild(select_div);
    }
}

async function get_report_sample() {

    $('#report_runs_box').hide();
    

    var runs = document.getElementsByName('run_id');
    for(var i in runs) {
        if(runs[i].checked==true){
            run_id = runs[i].id;
        }
    }

    s3 = new AWS.S3({apiVersion: '2006-03-01'});

    //SAMPLES

    var bucketParams = {
        Bucket : 'hakmonkey-genetics-lab',
        Prefix: 'Pipeline_Output/'+run_id+'/',
        Delimiter: '/'
    };
    
    var samples = [];
    var filtered_samples = [];

    s3.listObjects(bucketParams, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            for(const i in data['CommonPrefixes']) {
                samples.push(data['CommonPrefixes'][i]['Prefix'].substring(25,));
            }
            samples = samples.filter(distinct);
            samples = samples.filter(item => item);
            for(const i in samples) {
                if(samples[i].startsWith('_') == false && samples[i] != 'MultiQC/') {
                    filtered_samples.push(samples[i].slice(0,-1));
                }
            }
        }
    });

    // PANELS

    var bucketParams = {
        Bucket : 'hakmonkey-genetics-lab',
        Prefix: 'Pipeline/Reference/panels/',
        Delimiter: '/'
    };
    
    var panels = [];
    filtered_panels = [];

    s3.listObjects(bucketParams, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            for(const i in data['Contents']) {
                panels.push(data['Contents'][i]['Key'].substring(26,));
            }
            panels = panels.filter(distinct);
            panels = panels.filter(item => item);
            for(const i in panels) {
                if(panels[i].startsWith('_') == false) {
                    filtered_panels.push(panels[i]);
                }
            }
        }
    });



    $("#loader").show();

    await new Promise(r => setTimeout(r, 3000));

    var sample_list = document.getElementById('samples');

    for (const i in filtered_samples) {
        var sample_div = document.createElement('div');
        sample_div.setAttribute("class", "flex-child");
        sample_div.setAttribute("id", filtered_samples[i]+"_div");

        var sample_child_div = document.createElement("div");
        sample_child_div.setAttribute("class","flex-child-child");

        var choiceSelection = document.createElement('input');
        var choiceLabel = document.createElement('label');

        choiceSelection.setAttribute("type", "checkbox");
        choiceSelection.setAttribute("name", "sample_id");
        choiceSelection.setAttribute("id", filtered_samples[i]);
        choiceSelection.setAttribute("onchange", "get_panels('"+filtered_samples[i]+"_div','"+filtered_samples[i]+"')");

        choiceLabel.innerHTML=filtered_samples[i]+"<br/><br/>";
        choiceLabel.setAttribute("for", "sample_id");

        sample_child_div.appendChild(choiceSelection);
        sample_child_div.appendChild(choiceLabel);
        sample_div.appendChild(sample_child_div);
        sample_list.appendChild(sample_div);
    }

    $("#loader").hide();
    $("#report_selection_back").show();
    $('#report_selection').show();
    $('#report_sample_box').show();
    $('#email').show();
    $('#launch_report_button').show();

}

async function get_report_runs() {

    s3 = new AWS.S3({apiVersion: '2006-03-01'});

    var bucketParams = {
        Bucket : 'hakmonkey-genetics-lab',
        Prefix: 'Pipeline_Output/',
        Delimiter: '/'
    };
    
    var samples = [];
    var filtered_samples = [];

    s3.listObjects(bucketParams, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            for(const i in data['CommonPrefixes']) {
                samples.push(data['CommonPrefixes'][i]['Prefix'].substring(16, 24));
            }
            samples = samples.filter(distinct);
            samples = samples.filter(item => item);
            for(const i in samples) {
                if(samples[i].startsWith('_') == false) {
                    filtered_samples.push(samples[i]);
                }
            }
        }
    });

    $("#loader").show();

    await new Promise(r => setTimeout(r, 2000));

    var runs_list = document.getElementById('report_runs_list');

    for (const i in filtered_samples) {
        var choiceSelection = document.createElement('input');
        var choiceLabel = document.createElement('label');

        choiceSelection.setAttribute('type', 'radio');
        choiceSelection.setAttribute('name', 'run_id');
        choiceSelection.setAttribute('id', filtered_samples[i]);

        choiceLabel.innerHTML=filtered_samples[i]+'<br/><br/>';
        choiceLabel.setAttribute('for', 'run_id');

        runs_list.appendChild(choiceSelection);
        runs_list.appendChild(choiceLabel);
    }

    $("#loader").hide();
    $("#report_runs_box").show();
}