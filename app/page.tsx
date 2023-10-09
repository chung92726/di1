"use client";
import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function DemoReportAnIssue() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isFolderSelected, setIsFolderSelected] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadDone, setUploadDone] = useState<boolean>(false);
  const [uploadStarted, setUploadStarted] = useState<boolean>(false);

  const handleSubmit = async () => {
    const currentInputRef = isFolderSelected ? folderInputRef : fileInputRef;
    if (currentInputRef.current?.files?.length) {
      const promises = [];
      let filesDone = 0;
      setUploadStarted(true);
      const totalFiles = currentInputRef.current.files.length;
      for (const file of currentInputRef.current.files) {
        if (file.name.endsWith(".dcm")) {
          const promise = (async () => {
            try {
              const buffer = await file.arrayBuffer();
              const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
              const response = await fetch("/api/dicom", {
                method: "POST",
                headers: {
                  "Content-Type": "application/octet-stream",
                  "File-Name": file.name,
                  "File-Hash": hashHex,
                },
                body: file,
              });
              filesDone += 1;
              setUploadProgress((filesDone / totalFiles) * 100);
              // Note: not awaiting the response here, so uploads happen in parallel
              console.log(`Started upload for: ${file.name}`);
            } catch (error) {
              console.log(`Error starting upload for ${file.name}:`, error);
            }
          })();
          promises.push(promise);
        }
      }
      Promise.allSettled(promises).then((results) => {
        console.log("All files have been processed.");
        setUploadDone(true);
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadDone(false);
    setUploadProgress(0);
    setUploadStarted(false);
    if (e.target.files?.length) {
      setFileName(`${e.target.files.length} files selected`);
    }
  };

  const toggleInput = () => {
    setIsFolderSelected(!isFolderSelected);
    setFileName(null); // reset filename when toggling
  };

  return (
    <Card className="max-w-4xl m-auto mt-4">
      <CardHeader>
        <CardTitle>Upload DICOM files</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Button onClick={toggleInput}>
            {isFolderSelected
              ? "Switch to File Upload"
              : "Switch to Folder Upload"}
          </Button>
          {isFolderSelected ? (
            <>
              <Label htmlFor="dicomFolderUpload">Select Folder</Label>
              <Input
                id="dicomFolderUpload"
                type="file"
                className="cursor-pointer"
                ref={folderInputRef}
                onChange={handleFileChange}
                webkitdirectory=""
                multiple
              />
            </>
          ) : (
            <>
              <Label htmlFor="dicomFileUpload">Upload DICOM File</Label>
              <Input
                id="dicomFileUpload"
                type="file"
                className="cursor-pointer"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </>
          )}
          <div>{fileName && <>Selected: {fileName}</>}</div>
          <div>{uploadDone === true && <>All Uploads Initiated!</>}</div>
        </div>
      </CardContent>
      <CardFooter className="justify-between space-x-2">
        <Button onClick={handleSubmit}>Submit</Button>
        <>
          {uploadStarted && uploadProgress < 100 && (
            <div className="flex items-center space-x-2">
              <div>Uploading...</div>
              <div className="w-24 h-1 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </>
      </CardFooter>
    </Card>
  );
}
