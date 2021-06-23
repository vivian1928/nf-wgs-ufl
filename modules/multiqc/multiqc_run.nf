#!/usr/bin/env nextflow

nextflow.enable.dsl = 2

process MULTIQC_RUN {
    
    tag "${params.run_id}"
    publishDir "${params.run_dir}/MultiQC", mode: 'copy'
    label 'multiqc'
    label 'high_mem'

    input:
    path run_dir

    output:
    file "${params.run_id}.html"
    path "${params.run_id}_data"

    script:
    """
    multiqc -n ${params.run_id} .
    """
}